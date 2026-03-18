import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { prismaPlugin } from "./plugins/prisma.js";
import { rateLimitPlugin } from "./plugins/rate-limit.js";
import { helmetPlugin } from "./plugins/helmet.js";
import { authRoutes } from "./routes/auth.js";
import { credentialRoutes } from "./routes/credentials.js";
import { templateRoutes } from "./routes/templates.js";
import { workflowRoutes } from "./routes/workflows.js";
import { executionRoutes } from "./routes/executions.js";
import { billingRoutes } from "./routes/billing.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { settingsRoutes } from "./routes/settings.js";
import { notificationRoutes } from "./routes/notifications.js";
import { sseRoutes } from "./routes/sse.js";
import { reviewRoutes } from "./routes/reviews.js";
import { apiV1Routes } from "./routes/api-v1.js";
import { adminTemplateRoutes } from "./routes/admin-templates.js";
import { adminSyncLogRoutes } from "./routes/admin-sync-logs.js";
import { adminSettingsRoutes } from "./routes/admin-settings.js";
import { adminRichTemplateRoutes } from "./routes/admin-rich-templates.js";
import { adminUserRoutes } from "./routes/admin-users.js";
import { publicViewRoutes } from "./routes/public-views.js";
import { pdfProxyRoutes } from "./routes/pdf-proxy.js";
import { systemKeyRoutes } from "./routes/system-keys.js";
import { adminPlatformKeyRoutes } from "./routes/admin-platform-keys.js";
import { adminAnalysisRoutes } from "./routes/admin-analysis.js";
import { adminNodeLibraryRoutes } from "./routes/admin-node-library.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { billingHistoryRoutes } from "./routes/billing-history.js";
import { sessionRoutes } from "./routes/sessions.js";
import { mobileRoutes } from "./routes/mobile.js";
import { favoritesRoutes } from "./routes/favorites.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
});

await app.register(prismaPlugin);

// Security plugins
helmetPlugin(app);
rateLimitPlugin(app, { max: 100, windowMs: 60_000 });

app.addHook("onRequest", async (request) => {
  request.log.info({ method: request.method, url: request.url }, "incoming request");
});

// User routes
await app.register(authRoutes);
await app.register(credentialRoutes);
await app.register(templateRoutes);
await app.register(workflowRoutes);
await app.register(executionRoutes);
await app.register(billingRoutes);
await app.register(webhookRoutes);
await app.register(settingsRoutes);
await app.register(notificationRoutes);
await app.register(sseRoutes);
await app.register(reviewRoutes);
await app.register(dashboardRoutes);
await app.register(billingHistoryRoutes);
await app.register(sessionRoutes);
await app.register(mobileRoutes);
await app.register(favoritesRoutes);

// Public API v1
await app.register(apiV1Routes);

// Admin routes
await app.register(adminTemplateRoutes);
await app.register(adminSyncLogRoutes);
await app.register(adminSettingsRoutes);
await app.register(adminRichTemplateRoutes);
await app.register(adminUserRoutes);
await app.register(publicViewRoutes);
await app.register(pdfProxyRoutes);
await app.register(systemKeyRoutes);
await app.register(adminPlatformKeyRoutes);
await app.register(adminAnalysisRoutes);
await app.register(adminNodeLibraryRoutes);

app.get("/health", async () => ({ status: "ok" }));

// Start workers (non-blocking — server starts even if Redis is unavailable)
const workers = [
  { name: "sync", loader: () => import("./workers/sync.worker.js").then((m) => m.startSyncWorker()) },
  { name: "billing", loader: () => import("./workers/billing.worker.js").then((m) => m.startBillingWorker()) },
  { name: "execution", loader: () => import("./workers/execution.worker.js").then((m) => m.startExecutionWorker()) },
  { name: "notify", loader: () => import("./workers/notify.worker.js").then((m) => m.startNotifyWorker()) },
  { name: "dlq", loader: () => import("./workers/dlq.worker.js").then((m) => m.startDLQWorker()) },
];

for (const worker of workers) {
  try {
    await worker.loader();
  } catch (err) {
    app.log.warn({ err }, `Failed to start ${worker.name} worker`);
  }
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
