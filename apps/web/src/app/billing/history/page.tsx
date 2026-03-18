"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getBillingHistory } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  XCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface BillingRecord {
  id: string;
  date: string;
  amount: number;
  status: string;
  description: string;
  invoiceUrl?: string;
}

const statusConfig: Record<string, { label: string; variant: "success" | "destructive" | "warning" }> = {
  paid: { label: "Оплачено", variant: "success" },
  failed: { label: "Помилка", variant: "destructive" },
  pending: { label: "Очікує", variant: "warning" },
  refunded: { label: "Повернено", variant: "warning" },
};

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
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, page]);

  if (authLoading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
        <p className="mt-4 text-gray-500">Завантаження історії платежів...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <XCircle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-4 text-red-600">{error}</p>
        <Link href="/billing" className="mt-4 inline-block text-primary-600 hover:underline">
          Повернутися до білінгу
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/billing"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до білінгу
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Історія платежів</h1>
        {total > 0 && (
          <span className="text-sm text-gray-500">Всього: {total} записів</span>
        )}
      </div>

      {records.length === 0 ? (
        <div className="mt-12 rounded-xl border border-gray-200 bg-white py-16 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">Історія платежів порожня</p>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">Дата</th>
                  <th className="px-6 py-3 font-medium">Сума</th>
                  <th className="px-6 py-3 font-medium">Статус</th>
                  <th className="px-6 py-3 font-medium">Опис</th>
                  <th className="px-6 py-3 text-right font-medium">Інвойс</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record) => {
                  const config = statusConfig[record.status] ?? {
                    label: record.status,
                    variant: "default" as const,
                  };
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">
                        {new Date(record.date).toLocaleDateString("uk-UA")}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        ${(record.amount / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{record.description}</td>
                      <td className="px-6 py-4 text-right">
                        {record.invoiceUrl ? (
                          <a
                            href={record.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4" />
                              PDF
                            </Button>
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
