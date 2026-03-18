"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAdminTemplates,
  getSyncLogs,
  type AdminTemplate,
  type SyncLog,
} from "@/lib/admin-api";
import {
  FileJson,
  ExternalLink,
  AlertTriangle,
  Clock,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [tplRes, logsRes] = await Promise.allSettled([
          getAdminTemplates({ limit: "1000" }),
          getSyncLogs({ limit: "10", sort: "desc" }),
        ]);

        if (tplRes.status === "fulfilled") setTemplates(tplRes.value.data);
        if (logsRes.status === "fulfilled") setSyncLogs(logsRes.value.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Помилка завантаження");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <p className="text-gray-500">Завантаження...</p>;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        <p>{error}</p>
      </div>
    );
  }

  const totalTemplates = templates.length;
  const templatesWithJsonUrl = templates.filter((t) => t.jsonUrl).length;
  const templatesWithError = templates.filter(
    (t) => t.syncStatus === "error"
  ).length;
  const lastSync =
    syncLogs.length > 0
      ? new Date(syncLogs[0].createdAt).toLocaleString("uk-UA")
      : "—";

  const stats = [
    {
      label: "Всього шаблонів",
      value: totalTemplates,
      icon: FileJson,
      color: "text-primary-600 bg-primary-100",
    },
    {
      label: "Шаблони з JSON URL",
      value: templatesWithJsonUrl,
      icon: ExternalLink,
      color: "text-blue-600 bg-blue-100",
    },
    {
      label: "Помилки синхронізації",
      value: templatesWithError,
      icon: AlertTriangle,
      color: "text-red-600 bg-red-100",
    },
    {
      label: "Остання синхронізація",
      value: lastSync,
      icon: Clock,
      color: "text-green-600 bg-green-100",
    },
  ];

  const logStatusVariant: Record<string, "success" | "destructive" | "secondary"> = {
    success: "success",
    error: "destructive",
    no_change: "secondary",
  };

  const logStatusLabel: Record<string, string> = {
    success: "Успіх",
    error: "Помилка",
    no_change: "Без змін",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Панель управління</h1>
      <p className="mt-1 text-gray-600">Огляд стану шаблонів та синхронізацій</p>

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

      {/* Recent sync logs */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Останні синхронізації
        </h2>

        {syncLogs.length === 0 ? (
          <p className="mt-4 text-gray-500">Журнал синхронізацій порожній.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Шаблон</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium">Зміни</th>
                  <th className="px-4 py-3 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {log.templateName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={logStatusVariant[log.status] ?? "default"}>
                        {logStatusLabel[log.status] ?? log.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {log.changes
                        ? [
                            log.changes.nodesAdded?.length &&
                              `+${log.changes.nodesAdded.length} вузлів`,
                            log.changes.nodesRemoved?.length &&
                              `-${log.changes.nodesRemoved.length} вузлів`,
                            log.changes.credentialsAdded?.length &&
                              `+${log.changes.credentialsAdded.length} credentials`,
                            log.changes.credentialsRemoved?.length &&
                              `-${log.changes.credentialsRemoved.length} credentials`,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"
                        : log.error
                          ? log.error
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(log.createdAt).toLocaleString("uk-UA")}
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
