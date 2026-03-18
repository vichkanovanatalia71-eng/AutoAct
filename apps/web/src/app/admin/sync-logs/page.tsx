"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getSyncLogs,
  type SyncLog,
  type SyncLogsResponse,
} from "@/lib/admin-api";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

const STATUS_FILTERS = [
  { value: "", label: "Усі" },
  { value: "success", label: "Успіх" },
  { value: "error", label: "Помилка" },
  { value: "no_change", label: "Без змін" },
] as const;

const statusBadgeVariant: Record<
  string,
  "success" | "destructive" | "secondary"
> = {
  success: "success",
  error: "destructive",
  no_change: "secondary",
};

const statusLabel: Record<string, string> = {
  success: "Успіх",
  error: "Помилка",
  no_change: "Без змін",
};

export default function SyncLogsPage() {
  const [data, setData] = useState<SyncLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [templateFilter, setTemplateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: "20",
        sort: "desc",
      };
      if (templateFilter) params.templateId = templateFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await getSyncLogs(params);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [page, templateFilter, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function renderChanges(log: SyncLog) {
    if (!log.changes) {
      return log.error ? (
        <span className="text-red-600">{log.error}</span>
      ) : (
        <span className="text-gray-400">---</span>
      );
    }

    const c = log.changes;
    const hasSomething =
      (c.nodesAdded?.length ?? 0) > 0 ||
      (c.nodesRemoved?.length ?? 0) > 0 ||
      (c.credentialsAdded?.length ?? 0) > 0 ||
      (c.credentialsRemoved?.length ?? 0) > 0;

    if (!hasSomething) {
      return <span className="text-gray-400">Без змін</span>;
    }

    const summary = [
      c.nodesAdded?.length && `+${c.nodesAdded.length} вузлів`,
      c.nodesRemoved?.length && `-${c.nodesRemoved.length} вузлів`,
      c.credentialsAdded?.length && `+${c.credentialsAdded.length} cred`,
      c.credentialsRemoved?.length && `-${c.credentialsRemoved.length} cred`,
    ]
      .filter(Boolean)
      .join(", ");

    const isExpanded = expandedIds.has(log.id);

    return (
      <div>
        <button
          type="button"
          onClick={() => toggleExpand(log.id)}
          className="flex items-center gap-1 text-left text-gray-700 hover:text-gray-900"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          <span>{summary}</span>
        </button>
        {isExpanded && (
          <div className="mt-2 space-y-1 pl-4 text-xs text-gray-600">
            {c.nodesAdded?.length ? (
              <p>
                <span className="font-medium text-green-700">
                  Додано вузлів:
                </span>{" "}
                {c.nodesAdded.join(", ")}
              </p>
            ) : null}
            {c.nodesRemoved?.length ? (
              <p>
                <span className="font-medium text-red-700">
                  Видалено вузлів:
                </span>{" "}
                {c.nodesRemoved.join(", ")}
              </p>
            ) : null}
            {c.credentialsAdded?.length ? (
              <p>
                <span className="font-medium text-green-700">
                  Додано credentials:
                </span>{" "}
                {c.credentialsAdded.join(", ")}
              </p>
            ) : null}
            {c.credentialsRemoved?.length ? (
              <p>
                <span className="font-medium text-red-700">
                  Видалено credentials:
                </span>{" "}
                {c.credentialsRemoved.join(", ")}
              </p>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Журнал синхронізацій
      </h1>
      <p className="mt-1 text-gray-600">
        Історія синхронізацій шаблонів з зовнішніх JSON URL
      </p>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <Input
          placeholder="ID шаблону"
          value={templateFilter}
          onChange={(e) => {
            setTemplateFilter(e.target.value);
            setPage(1);
          }}
          className="w-64"
        />

        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="mt-8 text-gray-500">Завантаження...</p>
      ) : !data || data.data.length === 0 ? (
        <p className="mt-8 text-gray-500">Записів не знайдено.</p>
      ) : (
        <>
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
                {data.data.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {log.templateName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={statusBadgeVariant[log.status] ?? "secondary"}
                      >
                        {statusLabel[log.status] ?? log.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{renderChanges(log)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(log.createdAt).toLocaleString("uk-UA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Попередня
              </Button>
              <span className="text-sm text-gray-600">
                Сторінка {data.page} з {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Наступна
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
