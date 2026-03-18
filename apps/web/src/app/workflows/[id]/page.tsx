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
  workflowName: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  error?: string;
}

const statusLabel: Record<string, string> = {
  active: "Активний",
  paused: "Пауза",
  error: "Помилка",
};

const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
  active: "success",
  paused: "warning",
  error: "destructive",
};

const execStatusIcons: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  success: { icon: CheckCircle2, color: "text-green-600", label: "Успішно" },
  failed: { icon: XCircle, color: "text-red-600", label: "Помилка" },
  running: { icon: Loader2, color: "text-blue-600", label: "Виконується" },
  pending: { icon: AlertCircle, color: "text-amber-600", label: "Очікує" },
};

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

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
          getExecutions(id),
        ]);
        if (wf.status === "fulfilled") setWorkflow(wf.value);
        if (ex.status === "fulfilled") setExecutions(ex.value as Execution[]);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

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

  if (authLoading || loading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  if (!workflow) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Воркфлоу не знайдено</p>
        <Link
          href="/workflows"
          className="mt-4 inline-block text-primary-600 hover:underline"
        >
          Повернутися до воркфлоу
        </Link>
      </div>
    );
  }

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
                Перейти до облікових даних →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Workflow info */}
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
              <Button
                variant="outline"
                onClick={handleToggleStatus}
              >
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
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                Видалити
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-gray-500">Шаблон</p>
              <p className="font-medium text-gray-900">
                {workflow.templateName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Створено</p>
              <p className="font-medium text-gray-900">
                {new Date(workflow.createdAt).toLocaleDateString("uk-UA")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Всього виконань</p>
              <p className="font-medium text-gray-900">
                {workflow.executionCount}
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

          {/* Credential mapping */}
          {Object.keys(workflow.credentialMapping).length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-500">
                Прив&apos;язані облікові дані
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(workflow.credentialMapping).map(
                  ([service, credId]) => (
                    <Badge key={service} variant="outline">
                      {service}: {credId}
                    </Badge>
                  )
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution history */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Історія виконань
        </h2>
        {executions.length === 0 ? (
          <p className="mt-4 text-gray-500">Ще немає виконань</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">Статус</th>
                  <th className="px-6 py-3 font-medium">Початок</th>
                  <th className="px-6 py-3 font-medium">Завершення</th>
                  <th className="px-6 py-3 font-medium">Тривалість</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {executions.map((ex) => {
                  const info = execStatusIcons[ex.status] ?? execStatusIcons.pending;
                  const StatusIcon = info.icon;
                  const duration =
                    ex.duration ??
                    (ex.finishedAt
                      ? Math.round(
                          (new Date(ex.finishedAt).getTime() -
                            new Date(ex.startedAt).getTime()) /
                            1000
                        )
                      : null);
                  return (
                    <tr key={ex.id}>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-2 ${info.color}`}>
                          <StatusIcon className="h-4 w-4" />
                          {info.label}
                        </span>
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
                        {duration !== null ? `${duration}с` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
