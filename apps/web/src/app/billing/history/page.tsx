"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getBillingHistory } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  XCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface BillingRecord {
  id: string;
  date: string;
  amount: number;
  status: string;
  description: string;
  invoiceUrl?: string;
}

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "success" | "destructive" | "warning";
    icon: typeof CheckCircle2;
    color: string;
  }
> = {
  paid: {
    label: "Оплачено",
    variant: "success",
    icon: CheckCircle2,
    color: "text-green-600",
  },
  failed: {
    label: "Помилка",
    variant: "destructive",
    icon: XCircle,
    color: "text-red-600",
  },
  pending: {
    label: "Очікує",
    variant: "warning",
    icon: Clock,
    color: "text-yellow-600",
  },
  refunded: {
    label: "Повернено",
    variant: "warning",
    icon: AlertCircle,
    color: "text-yellow-600",
  },
};

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uk-UA", {
    month: "long",
    year: "numeric",
  });
}

export default function BillingHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    getBillingHistory(page)
      .then((res) => {
        setRecords(res.data);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Помилка завантаження")
      )
      .finally(() => setLoading(false));
  }, [user, page]);

  // Summary calculations
  const summary = useMemo(() => {
    const totalPaid = records
      .filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + r.amount, 0);
    const totalPending = records
      .filter((r) => r.status === "pending")
      .reduce((sum, r) => sum + r.amount, 0);
    const totalFailed = records
      .filter((r) => r.status === "failed")
      .reduce((sum, r) => sum + r.amount, 0);
    const paidCount = records.filter((r) => r.status === "paid").length;
    const pendingCount = records.filter((r) => r.status === "pending").length;
    const failedCount = records.filter((r) => r.status === "failed").length;

    return {
      totalPaid,
      totalPending,
      totalFailed,
      paidCount,
      pendingCount,
      failedCount,
    };
  }, [records]);

  // Group records by month
  const groupedRecords = useMemo(() => {
    const groups: Record<string, BillingRecord[]> = {};
    for (const record of records) {
      const key = formatMonthYear(record.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    }
    return groups;
  }, [records]);

  if (authLoading || !user) {
    return (
      <p className="py-20 text-center text-gray-500">Завантаження...</p>
    );
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
        <p className="mt-4 text-gray-500">
          Завантаження історії платежів...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <XCircle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-4 text-red-600">{error}</p>
        <Link
          href="/billing"
          className="mt-4 inline-block text-primary-600 hover:underline"
        >
          Повернутися до білінгу
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back navigation */}
      <Link
        href="/billing"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до білінгу
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Історія платежів
          </h1>
          {total > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {total} {total === 1 ? "запис" : total < 5 ? "записи" : "записів"}
            </p>
          )}
        </div>
      </div>

      {records.length === 0 ? (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white py-16 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 font-medium text-gray-600">
            Історія платежів порожня
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Тут з&apos;являться ваші платежі після першої оплати
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-500">
                      Сплачено
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatAmount(summary.totalPaid)}
                    </p>
                  </div>
                  {summary.paidCount > 0 && (
                    <Badge variant="success">{summary.paidCount}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-500">
                      Очікує оплати
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatAmount(summary.totalPending)}
                    </p>
                  </div>
                  {summary.pendingCount > 0 && (
                    <Badge variant="warning">{summary.pendingCount}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-500">
                      Не вдалося оплатити
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatAmount(summary.totalFailed)}
                    </p>
                  </div>
                  {summary.failedCount > 0 && (
                    <Badge variant="destructive">{summary.failedCount}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment records grouped by month */}
          <div className="mt-8 space-y-6">
            {Object.entries(groupedRecords).map(([monthLabel, monthRecords]) => {
              const monthTotal = monthRecords
                .filter((r) => r.status === "paid")
                .reduce((sum, r) => sum + r.amount, 0);
              const allPaid = monthRecords.every(
                (r) => r.status === "paid" || r.status === "refunded"
              );
              const hasFailed = monthRecords.some(
                (r) => r.status === "failed"
              );
              const hasPending = monthRecords.some(
                (r) => r.status === "pending"
              );

              return (
                <div key={monthLabel}>
                  {/* Month header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <h3 className="text-sm font-semibold capitalize text-gray-700">
                        {monthLabel}
                      </h3>
                      {allPaid && (
                        <Badge variant="success" className="text-xs">
                          Закрито
                        </Badge>
                      )}
                      {hasFailed && (
                        <Badge variant="destructive" className="text-xs">
                          Є борг
                        </Badge>
                      )}
                      {hasPending && !hasFailed && (
                        <Badge variant="warning" className="text-xs">
                          Очікує
                        </Badge>
                      )}
                    </div>
                    {monthTotal > 0 && (
                      <span className="text-sm font-medium text-gray-500">
                        {formatAmount(monthTotal)}
                      </span>
                    )}
                  </div>

                  {/* Records list */}
                  <Card>
                    <CardContent className="divide-y divide-gray-100 p-0">
                      {monthRecords.map((record) => {
                        const config = statusConfig[record.status] ?? {
                          label: record.status,
                          variant: "default" as const,
                          icon: DollarSign,
                          color: "text-gray-600",
                        };
                        const StatusIcon = config.icon;

                        return (
                          <div
                            key={record.id}
                            className="flex items-center gap-4 px-4 py-3.5 sm:px-5"
                          >
                            {/* Status icon */}
                            <div
                              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                                record.status === "paid"
                                  ? "bg-green-50"
                                  : record.status === "failed"
                                    ? "bg-red-50"
                                    : "bg-yellow-50"
                              }`}
                            >
                              <StatusIcon
                                className={`h-4.5 w-4.5 ${config.color}`}
                              />
                            </div>

                            {/* Main info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-medium text-gray-900">
                                  {record.description}
                                </p>
                              </div>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {formatDate(record.date)}
                              </p>
                            </div>

                            {/* Amount + status */}
                            <div className="flex flex-shrink-0 items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatAmount(record.amount)}
                                </p>
                                <Badge
                                  variant={config.variant}
                                  className="mt-0.5 text-xs"
                                >
                                  {config.label}
                                </Badge>
                              </div>

                              {/* Invoice download */}
                              {record.invoiceUrl ? (
                                <a
                                  href={record.invoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600"
                                  title="Завантажити PDF"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              ) : (
                                <div className="h-8 w-8" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Назад
              </Button>
              <span className="px-4 text-sm text-gray-600">
                Сторінка {page} з {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Далі
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
