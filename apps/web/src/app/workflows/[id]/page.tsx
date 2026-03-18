"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  getWorkflow,
  getExecutions,
  updateWorkflowStatus,
  deleteWorkflow,
  testWorkflow,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Play,
  Pause,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  FlaskConical,
  BarChart3,
  TrendingUp,
  Timer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface WorkflowData {
  id: string;
  name: string;
  status: string;
  templateId: string;
  templateName: string;
  triggerConfig: Record<string, unknown>;
  credentialMapping: Record<string, string>;
  lastExecution?: string;
  executionCount: number;
  createdAt: string;
  needsReconfiguration?: boolean;
  templateVersion?: number;
}

interface Execution {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: string;
  isTest: boolean;
  durationMs?: number;
  errorMessage?: string;
  startedAt: string;
  finishedAt?: string;
}

const statusLabel: Record<string, string> = {
  pending: "Очікує",
  testing: "Тестування",
  active: "Активний",
  paused: "Пауза",
  needs_attention: "Потребує уваги",
  error: "Помилка",
};

const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
  pending: "warning",
  testing: "warning",
  active: "success",
  paused: "warning",
  needs_attention: "destructive",
  error: "destructive",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const execStatusConfig: Record<
  string,
  { icon: typeof CheckCircle2; color: string; label: string; variant: "success" | "destructive" | "warning" | "default" }
> = {
  success: { icon: CheckCircle2, color: "text-green-600", label: "Успішно", variant: "success" },
  failed: { icon: XCircle, color: "text-red-600", label: "Помилка", variant: "destructive" },
  running: { icon: Loader2, color: "text-blue-600", label: "Виконується", variant: "warning" },
  pending: { icon: AlertCircle, color: "text-amber-600", label: "Очікує", variant: "default" },
};

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [execTotal, setExecTotal] = useState(0);
  const [execPage, setExecPage] = useState(1);
  const [execTotalPages, setExecTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);

  const id = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const [wf, ex] = await Promise.allSettled([
          getWorkflow(id),
          getExecutions({ workflowId: id, page: String(execPage) }),
        ]);
        if (wf.status === "fulfilled") setWorkflow(wf.value);
        if (wf.status === "rejected") setError("Не вдалося завантажити воркфлоу");
        if (ex.status === "fulfilled") {
          setExecutions(ex.value.data as Execution[]);
          setExecTotal(ex.value.total);
          setExecTotalPages(ex.value.totalPages);
        }
      } catch {
        setError("Не вдалося завантажити дані");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user, execPage]);

  async function handleToggleStatus() {
    if (!workflow) return;
    const newStatus = workflow.status === "active" ? "paused" : "active";
    try {
      await updateWorkflowStatus(id, newStatus as "active" | "paused");
      setWorkflow((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch {
      // handle error
    }
  }

  async function handleDelete() {
    if (!confirm("Видалити цей воркфлоу?")) return;
    try {
      await deleteWorkflow(id);
      router.push("/workflows");
    } catch {
      // handle error
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      await testWorkflow(id);
      setWorkflow((prev) => (prev ? { ...prev, status: "testing" } : prev));
    } catch {
      // handle error
    } finally {
      setTesting(false);
    }
  }

  function handleCopyWebhook() {
    if (!workflow) return;
    const webhookUrl = `${API_URL}/webhooks/${workflow.id}`;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (authLoading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
        <p className="mt-4 text-gray-500">Завантаження...</p>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="py-20 text-center">
        <XCircle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-4 text-gray-500">{error || "Воркфлоу не знайдено"}</p>
        <Link
          href="/workflows"
          className="mt-4 inline-block text-primary-600 hover:underline"
        >
          Повернутися до воркфлоу
        </Link>
      </div>
    );
  }

  // Compute stats from executions
  const totalRuns = workflow.executionCount;
  const successRuns = executions.filter((e) => e.status === "success").length;
  const failedRuns = executions.filter((e) => e.status === "failed").length;
  const successRate = totalRuns > 0 ? Math.round((successRuns / Math.max(executions.length, 1)) * 100) : 0;
  const avgDuration =
    executions.filter((e) => e.durationMs).length > 0
      ? Math.round(
          executions
            .filter((e) => e.durationMs)
            .reduce((sum, e) => sum + (e.durationMs || 0), 0) /
            executions.filter((e) => e.durationMs).length /
            1000
        )
      : 0;

  const errors = executions.filter((e) => e.status === "failed" && e.errorMessage);
  const errorCounts: Record<string, number> = {};
  errors.forEach((e) => {
    const msg = e.errorMessage || "Unknown";
    errorCounts[msg] = (errorCounts[msg] || 0) + 1;
  });
  const mostCommonError = Object.entries(errorCounts).sort((a, b) => b[1] - a[1])[0];

  // Credential mapping entries
  const credentialEntries = Object.entries(workflow.credentialMapping);

  return (
    <div>
      <Link
        href="/workflows"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до воркфлоу
      </Link>

      {/* Reconfiguration banner */}
      {workflow.needsReconfiguration && (
        <div className="mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-800">Потребує оновлення налаштувань</h3>
              <p className="mt-1 text-sm text-amber-700">
                Шаблон цього воркфлоу було оновлено. Додались нові обов&apos;язкові облікові дані.
                Будь ласка, оновіть налаштування для продовження роботи.
              </p>
              <Link
                href="/credentials"
                className="mt-2 inline-block text-sm font-medium text-amber-800 hover:underline"
              >
                Перейти до облікових даних &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header: Status badge + action buttons */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl">{workflow.name}</CardTitle>
              <Badge variant={statusVariant[workflow.status] ?? "default"}>
                {statusLabel[workflow.status] ?? workflow.status}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleToggleStatus}>
                {workflow.status === "active" ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Пауза
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Відновити
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || workflow.status === "testing"}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FlaskConical className="h-4 w-4" />
                )}
                Запустити зараз
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                Видалити
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Trigger info */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-gray-500">Шаблон</p>
              <p className="font-medium text-gray-900">{workflow.templateName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Створено</p>
              <p className="font-medium text-gray-900">
                {new Date(workflow.createdAt).toLocaleDateString("uk-UA")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Тип тригера</p>
              <p className="font-medium text-gray-900 capitalize">
                {(workflow.triggerConfig as { type?: string })?.type || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Останнє виконання</p>
              <p className="font-medium text-gray-900">
                {workflow.lastExecution
                  ? new Date(workflow.lastExecution).toLocaleString("uk-UA")
                  : "—"}
              </p>
            </div>
          </div>

          {/* Webhook URL */}
          {workflow.triggerConfig &&
            (workflow.triggerConfig as { type?: string }).type === "webhook" && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-medium text-gray-500">Webhook URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-800">
                    {API_URL}/webhooks/{workflow.id}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopyWebhook}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Всього запусків</p>
              <p className="text-2xl font-bold text-gray-900">{totalRuns}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Успішність</p>
              <p className="text-2xl font-bold text-gray-900">{successRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Timer className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Сер. тривалість</p>
              <p className="text-2xl font-bold text-gray-900">{avgDuration}с</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Помилки</p>
              <p className="text-2xl font-bold text-gray-900">{failedRuns}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most common error */}
      {mostCommonError && (
        <Card className="mt-6 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">Найчастіша помилка ({mostCommonError[1]} разів)</p>
                <p className="mt-1 text-sm text-red-700">{mostCommonError[0]}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credential Mapping Table */}
      {credentialEntries.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Облікові дані</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">Сервіс</th>
                  <th className="px-6 py-3 font-medium">Статус</th>
                  <th className="px-6 py-3 font-medium">Тип</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {credentialEntries.map(([service, value]) => {
                  const isSystemKey =
                    typeof value === "object" &&
                    value !== null &&
                    (value as unknown as { type?: string }).type === "system_key";
                  return (
                    <tr key={service}>
                      <td className="px-6 py-4 font-medium capitalize text-gray-900">{service}</td>
                      <td className="px-6 py-4">
                        <Badge variant="success">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Підключено
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={isSystemKey ? "secondary" : "outline"}>
                          {isSystemKey ? "Системний ключ" : "Ключ користувача"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7-day execution chart placeholder */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Графік виконань (7 днів)</h2>
        <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
          <p className="text-gray-400">Chart coming soon</p>
        </div>
      </div>

      {/* Execution history with pagination */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Історія виконань</h2>
          {execTotal > 0 && (
            <span className="text-sm text-gray-500">Всього: {execTotal}</span>
          )}
        </div>
        {executions.length === 0 ? (
          <p className="mt-4 text-gray-500">Ще немає виконань</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                    <th className="px-6 py-3 font-medium">Статус</th>
                    <th className="px-6 py-3 font-medium">Початок</th>
                    <th className="px-6 py-3 font-medium">Завершення</th>
                    <th className="px-6 py-3 font-medium">Тривалість</th>
                    <th className="px-6 py-3 font-medium">Тест</th>
                    <th className="px-6 py-3 font-medium">Помилка</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {executions.map((ex) => {
                    const info = execStatusConfig[ex.status] ?? execStatusConfig.pending;
                    const StatusIcon = info.icon;
                    const durationSec = ex.durationMs
                      ? Math.round(ex.durationMs / 1000)
                      : ex.finishedAt
                      ? Math.round(
                          (new Date(ex.finishedAt).getTime() -
                            new Date(ex.startedAt).getTime()) /
                            1000
                        )
                      : null;
                    return (
                      <tr key={ex.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Badge variant={info.variant}>
                            <StatusIcon
                              className={`mr-1 h-3 w-3 ${
                                ex.status === "running" ? "animate-spin" : ""
                              }`}
                            />
                            {info.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(ex.startedAt).toLocaleString("uk-UA")}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {ex.finishedAt
                            ? new Date(ex.finishedAt).toLocaleString("uk-UA")
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {durationSec !== null ? `${durationSec}с` : "—"}
                        </td>
                        <td className="px-6 py-4">
                          {ex.isTest && (
                            <Badge variant="secondary">Тест</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {ex.errorMessage ? (
                            <span className="text-xs text-red-600 line-clamp-1">
                              {ex.errorMessage}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {execTotalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExecPage(Math.max(1, execPage - 1))}
                  disabled={execPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm text-gray-600">
                  {execPage} / {execTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExecPage(Math.min(execTotalPages, execPage + 1))}
                  disabled={execPage === execTotalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
