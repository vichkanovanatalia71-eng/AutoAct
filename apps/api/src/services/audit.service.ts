import { prisma } from "@autoact/db";

export async function createAuditLog(params: {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({ data: params as any });
}

export async function getAuditLogs(params: {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
  resourceType?: string;
}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const where: Record<string, unknown> = {};
  if (params.userId) where.userId = params.userId;
  if (params.action) where.action = params.action;
  if (params.resourceType) where.resourceType = params.resourceType;

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
