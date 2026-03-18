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
import { adminTemplateRoutes } from "./routes/admin-templates.js";
import { adminSyncLogRoutes } from "./routes/admin-sync-logs.js";
import { adminSettingsRoutes } from "./routes/admin-settings.js";
import { adminRichTemplateRoutes } from "./routes/admin-rich-templates.js";
import { publicViewRoutes } from "./routes/public-views.js";
import { pdfProxyRoutes } from "./routes/pdf-proxy.js";

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
await app.register(adminTemplateRoutes);
await app.register(adminSyncLogRoutes);
await app.register(adminSettingsRoutes);
await app.register(adminRichTemplateRoutes);
await app.register(publicViewRoutes);
await app.register(pdfProxyRoutes);

app.get("/health", async () => ({ status: "ok" }));

// Start sync worker (non-blocking — server starts even if Redis is unavailable)
try {
  const { startSyncWorker } = await import("./workers/sync.worker.js");
  await startSyncWorker();
} catch (err) {
  app.log.warn({ err }, "Failed to start sync worker — sync features will be unavailable");
}

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`Server listening on ${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
