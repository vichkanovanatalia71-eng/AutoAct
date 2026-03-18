import type { FastifyRequest, FastifyReply } from "fastify";

export async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // First verify JWT
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const { userId } = request.user;
  const adminUser = await (request.server as any).prisma.adminUser.findUnique({
    where: { userId },
  });

  if (!adminUser) {
    return reply.status(403).send({ error: "Admin access required" });
  }

  // Attach admin role to request
  (request as any).adminRole = adminUser.role;
}
