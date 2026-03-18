import type { NodeType } from "@autoact/types";
import { prisma } from "@autoact/db";
import { httpRequestHandler } from "./http-request";
import { conditionHandler } from "./condition";
import { transformHandler } from "./transform";
import { setVariableHandler } from "./set-variable";
import { delayHandler } from "./delay";
import { emailHandler } from "./email";
import { loopHandler } from "./loop";
import { webhookHandler } from "./webhook";
import { cronHandler } from "./cron";

export type NodeHandler = (
  config: Record<string, unknown>,
  input: unknown,
  credentials: Record<string, Record<string, string>>,
) => Promise<unknown>;

export const nodeRegistry: Record<string, NodeHandler> = {
  http_request: httpRequestHandler,
  condition: conditionHandler,
  transform: transformHandler,
  set_variable: setVariableHandler,
  delay: delayHandler,
  email: emailHandler,
  loop: loopHandler,
  webhook: webhookHandler,
  cron: cronHandler,
};

// Cache compiled native node handlers
const nativeNodeCache = new Map<string, NodeHandler>();

export async function getNativeNodeHandler(
  config: Record<string, unknown>,
): Promise<NodeHandler | null> {
  const nativeNodeId = config.native_node_id as string | undefined;
  if (!nativeNodeId) return null;

  // Check cache first
  const cached = nativeNodeCache.get(nativeNodeId);
  if (cached) return cached;

  const nativeNode = await prisma.nativeNode.findUnique({
    where: { nodeId: nativeNodeId },
  });

  if (!nativeNode || nativeNode.status !== "active") return null;

  // Compile the executor code into a handler
  const handler: NodeHandler = async (config, input, credentials) => {
    const inputContext =
      input && typeof input === "object" ? (input as Record<string, unknown>) : {};

    const fn = new Function(
      "input",
      "config",
      "credentials",
      "Buffer",
      "JSON",
      "Math",
      "Date",
      `return (async function execute(input, config) {
        ${nativeNode.executorCode}
      })(input, config);`,
    );

    return fn(inputContext, config, credentials, Buffer, JSON, Math, Date);
  };

  nativeNodeCache.set(nativeNodeId, handler);
  return handler;
}
