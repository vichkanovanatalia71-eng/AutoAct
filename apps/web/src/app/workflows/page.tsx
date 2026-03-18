"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  getWorkflows,
  updateWorkflowStatus,
  deleteWorkflow as apiDeleteWorkflow,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Trash2, Zap, Plus } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  status: string;
  templateId: string;
  lastExecution?: string;
  executionCount: number;
  createdAt: string;
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

export default function WorkflowsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getWorkflows()
      .then((data) => setWorkflows(data as Workflow[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function handleToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      await updateWorkflowStatus(id, newStatus as "active" | "paused");
      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: newStatus } : w))
      );
    } catch {
      // handle error silently
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Видалити цей воркфлоу?")) return;
    try {
      await apiDeleteWorkflow(id);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch {
      // handle error silently
    }
  }

  if (authLoading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  if (loading) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Мої воркфлоу</h1>
        <Link href="/catalog">
          <Button>
            <Plus className="h-4 w-4" />
            Додати з каталогу
          </Button>
        </Link>
      </div>

      {workflows.length === 0 ? (
        <div className="mt-12 rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Zap className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">
            У вас ще немає активних воркфлоу.
          </p>
          <Link
            href="/catalog"
            className="mt-2 inline-block text-primary-600 hover:underline"
          >
            Перейдіть до каталогу
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <th className="px-6 py-3 font-medium">Назва</th>
                <th className="px-6 py-3 font-medium">Статус</th>
                <th className="px-6 py-3 font-medium">Останнє виконання</th>
                <th className="px-6 py-3 font-medium">Виконань</th>
                <th className="px-6 py-3 text-right font-medium">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workflows.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/workflows/${w.id}`}
                      className="font-medium text-primary-600 hover:underline"
                    >
                      {w.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={statusVariant[w.status] ?? "default"}
                    >
                      {statusLabel[w.status] ?? w.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {w.lastExecution
                      ? new Date(w.lastExecution).toLocaleString("uk-UA")
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {w.executionCount}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      {w.status === "active" ? (
                        <button
                          onClick={() => handleToggleStatus(w.id, w.status)}
                          className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"
                          title="Пауза"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(w.id, w.status)}
                          className="rounded-lg p-2 text-green-600 hover:bg-green-50"
                          title="Відновити"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        title="Видалити"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
