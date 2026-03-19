import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import type { CreateReviewRequest } from "@autoact/types";

export async function reviewRoutes(app: FastifyInstance) {
  // Create/update review for a template
  app.post<{ Params: { id: string }; Body: CreateReviewRequest }>(
    "/templates/:id/review",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { userId } = request.user;
      const { id: templateId } = request.params;
      const { rating, comment } = request.body;

      if (!rating || rating < 1 || rating > 5) {
        return reply.status(400).send({ error: "Rating must be between 1 and 5" });
      }

      const template = await app.prisma.workflowTemplate.findUnique({
        where: { id: templateId },
      });
      if (!template) {
        return reply.status(404).send({ error: "Template not found" });
      }

      const review = await app.prisma.workflowReview.upsert({
        where: { userId_templateId: { userId, templateId } },
        create: { userId, templateId, rating, comment },
        update: { rating, comment },
      });

      return reply.status(201).send({
        id: review.id,
        userId: review.userId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
      });
    },
  );

  // Get reviews for a template
  app.get<{ Params: { id: string }; Querystring: { page?: string; pageSize?: string } }>(
    "/templates/:id/reviews",
    async (request, reply) => {
      const { id: templateId } = request.params;
      const page = Math.max(1, parseInt(request.query.page || "1", 10));
      const pageSize = Math.min(50, Math.max(1, parseInt(request.query.pageSize || "10", 10)));

      const [reviews, total] = await Promise.all([
        app.prisma.workflowReview.findMany({
          where: { templateId },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { email: true } } },
        }),
        app.prisma.workflowReview.count({ where: { templateId } }),
      ]);

      // Calculate average rating
      const avgResult = await app.prisma.workflowReview.aggregate({
        where: { templateId },
        _avg: { rating: true },
      });

      // Mask email addresses to protect privacy
      function maskEmail(email: string): string {
        const [local, domain] = email.split("@");
        if (!domain) return "***";
        const masked = local.length > 2
          ? local[0] + "***" + local[local.length - 1]
          : "***";
        return `${masked}@${domain}`;
      }

      return reply.send({
        data: reviews.map((r) => ({
          id: r.id,
          userId: r.userId,
          userEmail: maskEmail(r.user.email),
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
        })),
        averageRating: avgResult._avg.rating ?? 0,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    },
  );
}
