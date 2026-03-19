import type { FastifyInstance } from "fastify";
import { authenticateAdmin } from "../plugins/admin.js";
import { generateNativeNode, testNativeNode } from "../services/node-generator.service.js";
import type { NodeToCreate } from "@autoact/types";

export async function adminNodeLibraryRoutes(app: FastifyInstance) {
  // GET /admin/node-library — List all native nodes
  app.get<{
    Querystring: {
      category?: string;
      status?: string;
      search?: string;
      page?: string;
      pageSize?: string;
    };
  }>("/admin/node-library", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const page = Math.max(1, parseInt(request.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize || "50", 10)));
    const { category, status, search } = request.query;

    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { nodeId: { contains: search, mode: "insensitive" } },
        { replaces: { hasSome: [search.toLowerCase()] } },
      ];
    }

    const [nodes, total] = await Promise.all([
      app.prisma.nativeNode.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          nodeId: true,
          name: true,
          category: true,
          replaces: true,
          status: true,
          isAiGenerated: true,
          createdAt: true,
        },
      }),
      app.prisma.nativeNode.count({ where }),
    ]);

    return reply.send({
      data: nodes,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    });
  });

  // GET /admin/node-library/:nodeId — Get node details with code
  app.get<{
    Params: { nodeId: string };
  }>("/admin/node-library/:nodeId", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const node = await app.prisma.nativeNode.findUnique({
      where: { nodeId: request.params.nodeId },
    });

    if (!node) {
      return reply.status(404).send({ error: "Вузол не знайдено" });
    }

    return reply.send(node);
  });

  // POST /admin/node-library — Create node manually
  app.post<{
    Body: {
      nodeId: string;
      name: string;
      category: string;
      replaces: string[];
      inputSchema: Record<string, unknown>;
      outputSchema: Record<string, unknown>;
      configSchema?: Record<string, unknown>;
      executorCode: string;
      testCases?: any[];
    };
  }>("/admin/node-library", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { nodeId, name, category, replaces, inputSchema, outputSchema, configSchema, executorCode, testCases } =
      request.body;

    if (!nodeId || !name || !executorCode) {
      return reply.status(400).send({ error: "nodeId, name та executorCode обов'язкові" });
    }

    const existing = await app.prisma.nativeNode.findUnique({ where: { nodeId } });
    if (existing) {
      return reply.status(409).send({ error: `Вузол "${nodeId}" вже існує` });
    }

    const node = await app.prisma.nativeNode.create({
      data: {
        nodeId,
        name,
        category: category || "Інше",
        replaces: replaces || [],
        inputSchema: JSON.parse(JSON.stringify(inputSchema || {})),
        outputSchema: JSON.parse(JSON.stringify(outputSchema || {})),
        configSchema: configSchema ? JSON.parse(JSON.stringify(configSchema)) : undefined,
        executorCode,
        testCases: testCases || undefined,
        status: "active",
        isAiGenerated: false,
      },
    });

    return reply.status(201).send(node);
  });

  // PATCH /admin/node-library/:nodeId — Update node
  app.patch<{
    Params: { nodeId: string };
    Body: {
      name?: string;
      category?: string;
      replaces?: string[];
      inputSchema?: Record<string, unknown>;
      outputSchema?: Record<string, unknown>;
      configSchema?: Record<string, unknown>;
      executorCode?: string;
      testCases?: any[];
      status?: string;
    };
  }>("/admin/node-library/:nodeId", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const node = await app.prisma.nativeNode.findUnique({
      where: { nodeId: request.params.nodeId },
    });

    if (!node) {
      return reply.status(404).send({ error: "Вузол не знайдено" });
    }

    const data: any = {};
    const body = request.body;
    if (body.name !== undefined) data.name = body.name;
    if (body.category !== undefined) data.category = body.category;
    if (body.replaces !== undefined) data.replaces = body.replaces;
    if (body.inputSchema !== undefined) data.inputSchema = body.inputSchema;
    if (body.outputSchema !== undefined) data.outputSchema = body.outputSchema;
    if (body.configSchema !== undefined) data.configSchema = body.configSchema;
    if (body.executorCode !== undefined) data.executorCode = body.executorCode;
    if (body.testCases !== undefined) data.testCases = body.testCases;
    if (body.status !== undefined) data.status = body.status;

    const updated = await app.prisma.nativeNode.update({
      where: { nodeId: request.params.nodeId },
      data,
    });

    return reply.send(updated);
  });

  // DELETE /admin/node-library/:nodeId — Delete or deprecate node
  app.delete<{
    Params: { nodeId: string };
    Querystring: { hard?: string };
  }>("/admin/node-library/:nodeId", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const node = await app.prisma.nativeNode.findUnique({
      where: { nodeId: request.params.nodeId },
    });

    if (!node) {
      return reply.status(404).send({ error: "Вузол не знайдено" });
    }

    if (request.query.hard === "true") {
      await app.prisma.nativeNode.delete({ where: { nodeId: request.params.nodeId } });
      return reply.send({ success: true, action: "deleted" });
    }

    await app.prisma.nativeNode.update({
      where: { nodeId: request.params.nodeId },
      data: { status: "deprecated" },
    });

    return reply.send({ success: true, action: "deprecated" });
  });

  // POST /admin/node-library/generate — AI generate a new native node
  app.post<{
    Body: NodeToCreate;
  }>("/admin/node-library/generate", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { suggestedId, name, replaces, implementationApproach, packages, inputSchema, outputSchema } =
      request.body;

    if (!suggestedId || !name) {
      return reply.status(400).send({ error: "suggestedId та name обов'язкові" });
    }

    const existing = await app.prisma.nativeNode.findUnique({ where: { nodeId: suggestedId } });
    if (existing) {
      return reply.status(409).send({ error: `Вузол "${suggestedId}" вже існує` });
    }

    try {
      const node = await generateNativeNode({
        suggestedId,
        name,
        replaces: replaces || [],
        implementationApproach: implementationApproach || "",
        packages: packages || [],
        inputSchema: inputSchema || {},
        outputSchema: outputSchema || {},
      });

      return reply.status(201).send(node);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Помилка генерації";
      return reply.status(500).send({ error: message });
    }
  });

  // POST /admin/node-library/:nodeId/test — Run test cases
  app.post<{
    Params: { nodeId: string };
  }>("/admin/node-library/:nodeId/test", { preHandler: [authenticateAdmin] }, async (request, reply) => {
    try {
      const result = await testNativeNode(request.params.nodeId);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Помилка тестування";
      return reply.status(500).send({ error: message });
    }
  });
}
