import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { prismaPlugin } from "./plugins/prisma.js";
import { authRoutes } from "./routes/auth.js";
import { credentialRoutes } from "./routes/credentials.js";
import { templateRoutes } from "./routes/templates.js";
import { workflowRoutes } from "./routes/workflows.js";
import { executionRoutes } from "./routes/executions.js";
import { billingRoutes } from "./routes/billing.js";
import { webhookRoutes } from "./routes/webhooks.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
});

await app.register(prismaPlugin);

app.addHook("onRequest", async (request) => {
  request.log.info({ method: request.method, url: request.url }, "incoming request");
});

await app.register(authRoutes);
await app.register(credentialRoutes);
await app.register(templateRoutes);
await app.register(workflowRoutes);
await app.register(executionRoutes);
await app.register(billingRoutes);
await app.register(webhookRoutes);

app.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`Server listening on ${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
