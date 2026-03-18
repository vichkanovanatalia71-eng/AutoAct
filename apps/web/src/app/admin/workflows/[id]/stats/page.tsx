"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Users,
  Play,
  CheckCircle2,
  Eye,
  TrendingUp,
} from "lucide-react";
import { getTemplateStats, getTemplateExecutionStats } from "@/lib/admin-api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface TemplateStats {
  totalActivations: number;
  activeNow: number;
  totalExecutions: number;
  successRate: number;
  views: number;
  conversionRate: number;
}

interface ExecutionDay {
  date: string;
  total: number;
  success: number;
  failed: number;
}

const PERIODS = [
  { label: "7 днів", value: "7d" },
  { label: "30 днів", value: "30d" },
  { label: "90 днів", value: "90d" },
] as const;

export default function TemplateStatsPage() {
  const params = useParams();
  const id = params.id as string;

  const [stats, setStats] = useState<TemplateStats | null>(null);
  const [executions, setExecutions] = useState<ExecutionDay[]>([]);
  const [period, setPeriod] = useState<string>("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const s = await getTemplateStats(id);
        setStats(s as TemplateStats);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Помилка завантаження");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const loadExecutions = useCallback(async () => {
    try {
      const data = await getTemplateExecutionStats(id, period);
      setExecutions((data as { days: ExecutionDay[] }).days || []);
    } catch {
      // silently fail for chart data
    }
  }, [id, period]);

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="mt-4 text-gray-500">Завантаження статистики...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-500">{error}</p>
        <Link
          href={`/admin/workflows/${id}`}
          className="mt-4 inline-block text-primary-600 hover:underline"
        >
          Повернутися
        </Link>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Статистика недоступна</p>
      </div>
    );
  }

  const maxExecution = Math.max(...executions.map((d) => d.total), 1);

  const statCards = [
    {
      label: "Всього активацій",
      value: stats.totalActivations,
      icon: Play,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Зараз активних",
      value: stats.activeNow,
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Всього виконань",
      value: stats.totalExecutions,
      icon: BarChart3,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Успішність",
      value: `${stats.successRate.toFixed(1)}%`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Перегляди",
      value: stats.views,
      icon: Eye,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Конверсія",
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div>
      <Link
        href={`/admin/workflows/${id}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до воркфлоу
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Статистика шаблону
      </h1>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}
                >
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {card.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Execution chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Виконання за період
            </CardTitle>
            <div className="flex gap-1 rounded-lg border bg-gray-50 p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    period === p.value
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Немає даних за обраний період
            </p>
          ) : (
            <div className="space-y-4">
              {/* Bar chart */}
              <div className="flex items-end gap-1" style={{ height: 200 }}>
                {executions.map((day) => {
                  const totalHeight = (day.total / maxExecution) * 100;
                  const successHeight =
                    day.total > 0
                      ? (day.success / day.total) * totalHeight
                      : 0;
                  const failedHeight = totalHeight - successHeight;

                  return (
                    <div
                      key={day.date}
                      className="group relative flex-1 flex flex-col justify-end"
                      style={{ height: "100%" }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap">
                          <p className="font-medium">{day.date}</p>
                          <p>Всього: {day.total}</p>
                          <p className="text-green-300">
                            Успішних: {day.success}
                          </p>
                          <p className="text-red-300">
                            Помилок: {day.failed}
                          </p>
                        </div>
                      </div>

                      {/* Bars */}
                      <div className="flex flex-col w-full">
                        {failedHeight > 0 && (
                          <div
                            className="w-full rounded-t bg-red-400 min-h-[2px]"
                            style={{ height: `${failedHeight}%` }}
                          />
                        )}
                        {successHeight > 0 && (
                          <div
                            className={`w-full bg-indigo-500 min-h-[2px] ${
                              failedHeight === 0 ? "rounded-t" : ""
                            } rounded-b-none`}
                            style={{ height: `${successHeight}%` }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="flex gap-1">
                {executions.map((day, i) => {
                  // Show label for every Nth item based on count
                  const step = Math.max(
                    1,
                    Math.floor(executions.length / 10)
                  );
                  if (i % step !== 0 && i !== executions.length - 1)
                    return <div key={day.date} className="flex-1" />;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 text-center text-[10px] text-gray-400"
                    >
                      {new Date(day.date).toLocaleDateString("uk-UA", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 pt-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="h-3 w-3 rounded bg-indigo-500" />
                  Успішні
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="h-3 w-3 rounded bg-red-400" />
                  Помилки
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
