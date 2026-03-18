import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { deriveKey, encrypt } from "../utils/crypto.js";
import type { CredentialCreateRequest } from "@autoact/types";

export async function credentialRoutes(app: FastifyInstance) {
  app.get("/credentials", { preHandler: [authenticate] }, async (request, reply) => {
    const { userId } = request.user;

    const credentials = await app.prisma.credential.findMany({
      where: { userId },
      select: {
        id: true,
        serviceType: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send(
      credentials.map((c) => ({
        id: c.id,
        serviceType: c.serviceType,
        name: c.name,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  });

  app.post<{ Body: CredentialCreateRequest }>(
    "/credentials",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { serviceType, name, data } = request.body;

      if (!serviceType || !name || !data) {
        return reply.status(400).send({ error: "serviceType, name, and data are required" });
      }

      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: { salt: true },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const masterKey = process.env.ENCRYPTION_MASTER_KEY;
      if (!masterKey) {
        return reply.status(500).send({ error: "Encryption is not configured" });
      }

      const key = deriveKey(masterKey, user.salt);
      const { encrypted, iv } = encrypt(JSON.stringify(data), key);

      const credential = await app.prisma.credential.create({
        data: {
          userId,
          serviceType,
          name,
          encryptedData: encrypted,
          iv,
        },
      });

      return reply.status(201).send({
        id: credential.id,
        serviceType: credential.serviceType,
        name: credential.name,
        createdAt: credential.createdAt.toISOString(),
      });
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/credentials/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id } = request.params;

      const credential = await app.prisma.credential.findUnique({
        where: { id },
      });

      if (!credential) {
        return reply.status(404).send({ error: "Credential not found" });
      }

      if (credential.userId !== userId) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      await app.prisma.credential.delete({ where: { id } });

      return reply.status(204).send();
    }
  );
}
