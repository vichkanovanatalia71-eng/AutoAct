"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getExecutions, getWorkflows, getUsage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  BarChart3,
  Gauge,
  CreditCard,
  Search,
  Plus,
} from "lucide-react";

interface Execution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
}

interface UsageData {
  plan: string;
  executionsUsed: number;
  executionsLimit: number;
}

const statusVariant: Record<string, "success" | "destructive" | "warning" | "default"> = {
  success: "success",
  failed: "destructive",
  running: "warning",
  pending: "default",
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<{ id: string; status: string }[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const [wf, ex, us] = await Promise.allSettled([
          getWorkflows(),
          getExecutions(),
          getUsage(),
        ]);
        if (wf.status === "fulfilled") setWorkflows(wf.value);
        if (ex.status === "fulfilled") setExecutions(ex.value.slice(0, 10));
        if (us.status === "fulfilled") setUsage(us.value);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (authLoading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  const activeWorkflows = workflows.filter((w) => w.status === "active").length;

  const stats = [
    {
      label: "Активні воркфлоу",
      value: activeWorkflows,
      icon: Zap,
      color: "text-primary-600 bg-primary-100",
    },
    {
      label: "Виконань цього місяця",
      value: usage?.executionsUsed ?? "—",
      icon: BarChart3,
      color: "text-green-600 bg-green-100",
    },
    {
      label: "Ліміт виконань",
      value: usage?.executionsLimit ?? "—",
      icon: Gauge,
      color: "text-amber-600 bg-amber-100",
    },
    {
      label: "Тарифний план",
      value: usage?.plan ?? user.plan ?? "Free",
      icon: CreditCard,
      color: "text-indigo-600 bg-indigo-100",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Панель управління</h1>
      <p className="mt-1 text-gray-600">Вітаємо, {user.email}</p>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.color}`}
              >
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/catalog">
          <Button variant="outline">
            <Search className="h-4 w-4" />
            Переглянути каталог
          </Button>
        </Link>
        <Link href="/credentials">
          <Button variant="outline">
            <Plus className="h-4 w-4" />
            Додати credentials
          </Button>
        </Link>
      </div>

      {/* Recent executions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Останні виконання
        </h2>
        {loading ? (
          <p className="mt-4 text-gray-500">Завантаження...</p>
        ) : executions.length === 0 ? (
          <p className="mt-4 text-gray-500">
            Ще немає виконань. Активуйте воркфлоу з каталогу.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Воркфлоу</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Початок</th>
                  <th className="px-4 py-3 font-medium">Завершення</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((ex) => (
                  <tr
                    key={ex.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {ex.workflowName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[ex.status] ?? "default"}>
                        {ex.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(ex.startedAt).toLocaleString("uk-UA")}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ex.finishedAt
                        ? new Date(ex.finishedAt).toLocaleString("uk-UA")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
