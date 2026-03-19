import type { WorkflowDefinition, WorkflowNode, ExecutionLogEntry } from "@autoact/types";
import { type NodeHandler, nodeRegistry, getNativeNodeHandler } from "./nodes";

export interface ExecutorOptions {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  enableParallel?: boolean;
  circuitBreakerThreshold?: number;
}

const DEFAULT_OPTIONS: Required<ExecutorOptions> = {
  timeoutMs: 300_000, // 5 minutes
  maxRetries: 3,
  retryDelayMs: 1000,
  enableParallel: true,
  circuitBreakerThreshold: 5,
};

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

export class GraphExecutor {
  private definition: WorkflowDefinition;
  private credentials: Record<string, Record<string, string>>;
  private options: Required<ExecutorOptions>;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private abortController: AbortController;

  constructor(
    definition: WorkflowDefinition,
    credentials: Record<string, Record<string, string>>,
    options?: ExecutorOptions,
  ) {
    this.definition = definition;
    this.credentials = credentials;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.abortController = new AbortController();
  }

  abort(): void {
    this.abortController.abort();
  }

  private checkCircuitBreaker(nodeType: string): boolean {
    const state = this.circuitBreakers.get(nodeType);
    if (!state) return false;

    if (state.isOpen) {
      // Check if enough time has passed to half-open (30 seconds)
      if (Date.now() - state.lastFailure > 30_000) {
        state.isOpen = false;
        state.failures = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  private recordCircuitBreakerFailure(nodeType: string): void {
    let state = this.circuitBreakers.get(nodeType);
    if (!state) {
      state = { failures: 0, lastFailure: 0, isOpen: false };
      this.circuitBreakers.set(nodeType, state);
    }
    state.failures++;
    state.lastFailure = Date.now();
    if (state.failures >= this.options.circuitBreakerThreshold) {
      state.isOpen = true;
    }
  }

  private async executeWithRetry(
    handler: Function,
    config: Record<string, unknown>,
    inputContext: Record<string, unknown>,
    credentials: Record<string, Record<string, string>>,
    retries: number,
  ): Promise<unknown> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await handler(config, inputContext, credentials);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < retries) {
          const delay = this.options.retryDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  private async executeWithTimeout<T>(promise: Promise<T>): Promise<T> {
    const signal = this.abortController.signal;

    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`Execution timeout after ${this.options.timeoutMs}ms`)),
          this.options.timeoutMs,
        );

        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("Execution aborted"));
        });
      }),
    ]);
  }

  async execute(payload?: unknown): Promise<ExecutionLogEntry[]> {
    const logs: ExecutionLogEntry[] = [];
    const nodes = this.definition.nodes;

    if (nodes.length === 0) {
      return logs;
    }

    // Build a lookup map: nodeId → WorkflowNode
    const nodeMap = new Map<string, WorkflowNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    // Find start node: first webhook/cron type node, or just the first node
    let startNode = nodes.find((n) => n.type === "webhook" || n.type === "cron");
    if (!startNode) {
      startNode = nodes[0];
    }

    // BFS traversal
    const queue: Array<{ nodeId: string; input: unknown }> = [
      { nodeId: startNode.id, input: payload },
    ];
    const visited = new Set<string>();
    const nodeOutputs = new Map<string, unknown>();

    const executeNode = async (
      nodeId: string,
      input: unknown,
    ): Promise<{ nextNodes: Array<{ nodeId: string; input: unknown }> } | null> => {
      if (this.abortController.signal.aborted) {
        return null;
      }

      const node = nodeMap.get(nodeId);
      if (!node) return null;

      // Circuit breaker check
      if (this.checkCircuitBreaker(node.type)) {
        logs.push({
          nodeId,
          nodeType: node.type,
          status: "error",
          duration: 0,
          error: `Circuit breaker open for node type: ${node.type}`,
        });
        return null;
      }

      let handler: NodeHandler | undefined = nodeRegistry[node.type];
      if (!handler && node.type === "native") {
        handler = (await getNativeNodeHandler(node.config)) ?? undefined;
      }
      if (!handler) {
        logs.push({
          nodeId,
          nodeType: node.type,
          status: "error",
          duration: 0,
          error: `Unknown node type: ${node.type}`,
        });
        return null;
      }

      const inputContext: Record<string, unknown> =
        input && typeof input === "object" ? { ...(input as Record<string, unknown>) } : {};
      for (const [id, output] of nodeOutputs.entries()) {
        inputContext[id] = output;
      }

      const startTime = Date.now();
      try {
        const output = await this.executeWithRetry(
          handler,
          node.config,
          inputContext,
          this.credentials,
          node.type === "http_request" || node.type === "email" ? this.options.maxRetries : 0,
        );
        const duration = Date.now() - startTime;

        nodeOutputs.set(nodeId, output);

        logs.push({
          nodeId,
          nodeType: node.type,
          status: "success",
          duration,
          output,
        });

        // Determine next nodes
        const nextNodes: Array<{ nodeId: string; input: unknown }> = [];
        if (node.type === "condition") {
          const conditionResult = (output as Record<string, unknown>)?.result;
          const nextIds = conditionResult ? (node.next_true ?? []) : (node.next_false ?? []);
          for (const nextId of nextIds) {
            nextNodes.push({ nodeId: nextId, input: output });
          }
        } else {
          const nextIds = node.next ?? [];
          for (const nextId of nextIds) {
            nextNodes.push({ nodeId: nextId, input: output });
          }
        }

        return { nextNodes };
      } catch (err) {
        const duration = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : String(err);

        this.recordCircuitBreakerFailure(node.type);

        logs.push({
          nodeId,
          nodeType: node.type,
          status: "error",
          duration,
          error: errorMessage,
        });

        return null;
      }
    };

    try {
      await this.executeWithTimeout(
        (async () => {
          while (queue.length > 0) {
            if (this.abortController.signal.aborted) break;

            // Collect all items at current level that can be parallel
            const currentBatch: Array<{ nodeId: string; input: unknown }> = [];
            while (queue.length > 0) {
              const item = queue.shift()!;
              if (!visited.has(item.nodeId)) {
                visited.add(item.nodeId);
                currentBatch.push(item);
              }
            }

            if (currentBatch.length === 0) break;

            // Execute in parallel if enabled and multiple nodes at same level
            if (this.options.enableParallel && currentBatch.length > 1) {
              const results = await Promise.all(
                currentBatch.map((item) => executeNode(item.nodeId, item.input)),
              );

              for (const result of results) {
                if (result?.nextNodes) {
                  for (const next of result.nextNodes) {
                    queue.push(next);
                  }
                }
              }
            } else {
              for (const item of currentBatch) {
                const result = await executeNode(item.nodeId, item.input);
                if (result?.nextNodes) {
                  for (const next of result.nextNodes) {
                    queue.push(next);
                  }
                } else if (logs[logs.length - 1]?.status === "error") {
                  // Stop on first error in sequential mode
                  return;
                }
              }
            }
          }
        })(),
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logs.push({
        nodeId: "__executor__",
        nodeType: "system",
        status: "error",
        duration: 0,
        error: errorMessage,
      });
    }

    return logs;
  }
}
