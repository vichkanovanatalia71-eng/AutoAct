"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getDashboard } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Zap,
  BarChart3,
  DollarSign,
  Search,
  Plus,
  ArrowUpCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

interface DashboardData {
  user: { email: string; plan: string };
  planRenewalDate?: string;
  usage: {
    executionsUsed: number;
    executionsLimit: number;
    workflowsUsed: number;
    workflowsLimit: number;
    systemKeyCostCents: number;
  };
  stats: {
    activeWorkflows: number;
    executionsToday: number;
    systemKeyCost: number;
  };
  needsAttention: Array<{
    workflowId: string;
    workflowName: string;
    reason: string;
  }>;
  recentActivity: Array<{
    id: string;
    workflowName: string;
    status: string;
    duration?: number;
    triggerType: string;
    startedAt: string;
    finishedAt?: string;
  }>;
}

const statusVariant: Record<string, "success" | "destructive" | "warning" | "default"> = {
  success: "success",
  failed: "destructive",
  running: "warning",
  pending: "default",
};

const statusLabel: Record<string, string> = {
  success: "Успішно",
  failed: "Помилка",
  running: "Виконується",
  pending: "Очікує",
};

const statusIcons: Record<string, React.ElementType> = {
  success: CheckCircle2,
  failed: XCircle,
  running: Loader2,
  pending: Clock,
};

const triggerLabel: Record<string, string> = {
  webhook: "Webhook",
  cron: "За розкладом",
  manual: "Ручний",
};

const planBadgeVariant: Record<string, "default" | "success" | "warning"> = {
  free: "default",
  pro: "success",
  business: "warning",
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const dashboard = await getDashboard();
        setData(dashboard);
      } catch (e: any) {
        setError(e.message || "Не вдалося завантажити дані");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (authLoading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
        <p className="mt-4 text-gray-500">Завантаження панелі управління...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <XCircle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-4 text-red-600">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Спробувати знову
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const execPercent =
    data.usage.executionsLimit > 0
      ? Math.min(100, Math.round((data.usage.executionsUsed / data.usage.executionsLimit) * 100))
      : 0;

  const wfPercent =
    data.usage.workflowsLimit > 0
      ? Math.min(100, Math.round((data.usage.workflowsUsed / data.usage.workflowsLimit) * 100))
      : 0;

  const planName = data.user.plan || user.plan || "Free";

  return (
    <div>
      {/* Header with welcome + notification bell */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Панель управління</h1>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-gray-600">Вітаємо, {data.user.email || user.email}</p>
            <Badge variant={planBadgeVariant[planName.toLowerCase()] ?? "default"}>
              {planName}
            </Badge>
            {data.planRenewalDate && (
              <span className="text-xs text-gray-500">
                Оновлення: {new Date(data.planRenewalDate).toLocaleDateString("uk-UA")}
              </span>
            )}
          </div>
        </div>
        <Link href="/notifications">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Сповіщення</span>
          </Button>
        </Link>
      </div>

      {/* Usage meters */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Виконання</p>
              <span className="text-sm text-gray-500">
                {data.usage.executionsUsed.toLocaleString()} / {data.usage.executionsLimit.toLocaleString()}
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all ${
                  execPercent > 80 ? "bg-red-500" : execPercent > 60 ? "bg-amber-500" : "bg-primary-500"
                }`}
                style={{ width: `${execPercent}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-gray-500">{execPercent}% використано</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Воркфлоу</p>
              <span className="text-sm text-gray-500">
                {data.usage.workflowsUsed} / {data.usage.workflowsLimit}
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all ${
                  wfPercent > 80 ? "bg-red-500" : wfPercent > 60 ? "bg-amber-500" : "bg-primary-500"
                }`}
                style={{ width: `${wfPercent}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-gray-500">{wfPercent}% використано</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Активні воркфлоу</p>
              <p className="text-2xl font-bold text-gray-900">{data.stats.activeWorkflows}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Виконань сьогодні</p>
              <p className="text-2xl font-bold text-gray-900">{data.stats.executionsToday}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Витрати на системні ключі</p>
              <p className="text-2xl font-bold text-gray-900">
                ${(data.stats.systemKeyCost / 100).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Needs Attention Banner */}
      {data.needsAttention.length > 0 && (
        <div className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Потребує уваги</h3>
              <ul className="mt-2 space-y-1">
                {data.needsAttention.map((item) => (
                  <li key={item.workflowId} className="text-sm text-amber-700">
                    <Link
                      href={`/workflows/${item.workflowId}`}
                      className="font-medium hover:underline"
                    >
                      {item.workflowName}
                    </Link>
                    {" — "}
                    {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Table */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Остання активність</h2>
        {data.recentActivity.length === 0 ? (
          <p className="mt-4 text-gray-500">
            Ще немає виконань. Активуйте воркфлоу з каталогу.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Воркфлоу</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Тривалість</th>
                  <th className="px-4 py-3 font-medium">Тригер</th>
                  <th className="px-4 py-3 font-medium">Початок</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentActivity.map((activity) => {
                  const StatusIcon = statusIcons[activity.status] ?? Clock;
                  const durationSec = activity.duration
                    ? Math.round(activity.duration / 1000)
                    : activity.finishedAt
                    ? Math.round(
                        (new Date(activity.finishedAt).getTime() -
                          new Date(activity.startedAt).getTime()) /
                          1000
                      )
                    : null;
                  return (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {activity.workflowName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[activity.status] ?? "default"}>
                          <StatusIcon className={`mr-1 h-3 w-3 ${activity.status === "running" ? "animate-spin" : ""}`} />
                          {statusLabel[activity.status] ?? activity.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {durationSec !== null ? `${durationSec}с` : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {triggerLabel[activity.triggerType] ?? activity.triggerType}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(activity.startedAt).toLocaleString("uk-UA")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
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
        <Link href="/billing">
          <Button variant="outline">
            <ArrowUpCircle className="h-4 w-4" />
            Оновити план
          </Button>
        </Link>
      </div>
    </div>
  );
}
