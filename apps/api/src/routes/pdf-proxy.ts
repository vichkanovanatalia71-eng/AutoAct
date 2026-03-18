import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";

export async function pdfProxyRoutes(app: FastifyInstance) {
  // GET /proxy/pdf/:templateId/:pdfIndex — Proxy a PDF attachment
  app.get<{
    Params: { templateId: string; pdfIndex: string };
  }>("/proxy/pdf/:templateId/:pdfIndex", { preHandler: [authenticate] }, async (request, reply) => {
    const { templateId, pdfIndex } = request.params;
    const index = parseInt(pdfIndex, 10);

    if (Number.isNaN(index) || index < 0) {
      return reply.status(400).send({ error: "Invalid PDF index" });
    }

    const template = await app.prisma.workflowTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return reply.status(404).send({ error: "Template not found" });
    }

    const attachments = Array.isArray(template.pdfAttachments)
      ? (template.pdfAttachments as any[])
      : [];

    if (index >= attachments.length) {
      return reply.status(404).send({ error: "PDF attachment not found" });
    }

    const pdf = attachments[index];

    if (pdf.source !== "external" || !pdf.url) {
      return reply.status(404).send({ error: "PDF attachment not available" });
    }

    try {
      const response = await fetch(pdf.url);
      if (!response.ok) {
        return reply.status(502).send({ error: "Failed to fetch PDF from source" });
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      return reply
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", "inline")
        .send(buffer);
    } catch (err: any) {
      request.log.error(err, "Failed to proxy PDF");
      return reply.status(502).send({ error: "Failed to fetch PDF from source" });
    }
  });
}
