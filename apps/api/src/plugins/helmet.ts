import type { FastifyInstance } from "fastify";

export function helmetPlugin(app: FastifyInstance) {
  app.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "0");
    reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    reply.header("X-Download-Options", "noopen");
    reply.header("X-Permitted-Cross-Domain-Policies", "none");
    reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
    reply.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );
  });
}
