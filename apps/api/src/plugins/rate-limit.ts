import type { FastifyInstance } from "fastify";

interface RateLimitStore {
  hits: number;
  resetAt: number;
}

const store = new Map<string, RateLimitStore>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now > value.resetAt) {
      store.delete(key);
    }
  }
}, 60_000);

export function rateLimitPlugin(app: FastifyInstance, opts: { max?: number; windowMs?: number } = {}) {
  const max = opts.max ?? 100;
  const windowMs = opts.windowMs ?? 60_000;

  app.addHook("onRequest", async (request, reply) => {
    const ip = request.ip;
    const key = `${ip}:${request.routeOptions?.url || request.url}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { hits: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.hits++;

    reply.header("X-RateLimit-Limit", max);
    reply.header("X-RateLimit-Remaining", Math.max(0, max - entry.hits));
    reply.header("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.hits > max) {
      return reply.status(429).send({
        error: "Too many requests",
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
    }
  });
}
