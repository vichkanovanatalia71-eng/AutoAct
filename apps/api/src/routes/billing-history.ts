import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";

export async function billingHistoryRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { page?: string; pageSize?: string } }>(
    "/billing/history",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const page = Math.max(1, parseInt(request.query.page || "1", 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(request.query.pageSize || "20", 10)));
      const skip = (page - 1) * pageSize;

      const [invoices, total] = await Promise.all([
        app.prisma.billingInvoice.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        app.prisma.billingInvoice.count({
          where: { userId },
        }),
      ]);

      return reply.send({
        data: invoices.map((inv) => ({
          id: inv.id,
          amount: inv.amount,
          status: inv.status,
          description: inv.description,
          invoiceUrl: inv.invoiceUrl,
          periodStart: inv.periodStart.toISOString(),
          periodEnd: inv.periodEnd.toISOString(),
          createdAt: inv.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    },
  );
}
