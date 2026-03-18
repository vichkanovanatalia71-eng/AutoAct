import type { WorkflowDefinition, WorkflowNode, ExecutionLog } from "@autoact/types";
import { nodeRegistry, getNativeNodeHandler } from "./nodes";

export class GraphExecutor {
  private definition: WorkflowDefinition;
  private credentials: Record<string, Record<string, string>>;

  constructor(
    definition: WorkflowDefinition,
    credentials: Record<string, Record<string, string>>,
  ) {
    this.definition = definition;
    this.credentials = credentials;
  }

  async execute(payload?: unknown): Promise<ExecutionLog[]> {
    const logs: ExecutionLog[] = [];
    const nodes = this.definition.nodes;

    if (nodes.length === 0) {
      return logs;
    }

    // Build a lookup map: nodeId → WorkflowNode
    const nodeMap = new Map<string, WorkflowNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    // Build adjacency map from nodes
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) {
      adjacency.set(node.id, node.next ?? []);
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
    // Store outputs keyed by nodeId for template substitution
    const nodeOutputs = new Map<string, unknown>();

    while (queue.length > 0) {
      const { nodeId, input } = queue.shift()!;

      if (visited.has(nodeId)) {
        continue;
      }
      visited.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) {
        continue;
      }

      let handler = nodeRegistry[node.type];
      if (!handler && node.type === "native") {
        handler = await getNativeNodeHandler(node.config) ?? undefined;
      }
      if (!handler) {
        logs.push({
          nodeId,
          status: "error",
          duration: 0,
          error: `Unknown node type: ${node.type}`,
        });
        break;
      }

      // Build context that includes all previous node outputs for template substitution
      const inputContext: Record<string, unknown> =
        input && typeof input === "object" ? { ...(input as Record<string, unknown>) } : {};
      for (const [id, output] of nodeOutputs.entries()) {
        inputContext[id] = output;
      }

      const startTime = Date.now();
      try {
        const output = await handler(node.config, inputContext, this.credentials);
        const duration = Date.now() - startTime;

        nodeOutputs.set(nodeId, output);

        logs.push({
          nodeId,
          status: "success",
          duration,
          output,
        });

        // Determine next nodes
        if (node.type === "condition") {
          const conditionResult = (output as Record<string, unknown>)?.result;
          const nextNodes = conditionResult ? (node.next_true ?? []) : (node.next_false ?? []);
          for (const nextId of nextNodes) {
            queue.push({ nodeId: nextId, input: output });
          }
        } else {
          const nextNodes = node.next ?? [];
          for (const nextId of nextNodes) {
            queue.push({ nodeId: nextId, input: output });
          }
        }
      } catch (err) {
        const duration = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : String(err);

        logs.push({
          nodeId,
          status: "error",
          duration,
          error: errorMessage,
        });

        // Stop on first error
        break;
      }
    }

    return logs;
  }
}
