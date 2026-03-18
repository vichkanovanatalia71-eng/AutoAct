import type { NodeType } from "@autoact/types";
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

export const nodeRegistry: Record<NodeType, NodeHandler> = {
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
