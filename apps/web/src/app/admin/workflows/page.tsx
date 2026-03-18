"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getAdminTemplates,
  syncTemplate,
  type AdminTemplate,
  type AdminTemplatesResponse,
} from "@/lib/admin-api";
import {
  Plus,
  Edit,
  RefreshCw,
  Search,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

const SYNC_STATUS_FILTERS = [
  { value: "", label: "Усі" },
  { value: "idle", label: "idle" },
  { value: "syncing", label: "syncing" },
  { value: "error", label: "error" },
] as const;

const syncBadgeVariant: Record<string, "secondary" | "default" | "destructive"> = {
  idle: "secondary",
  syncing: "default",
  error: "destructive",
};

export default function AdminWorkflowsPage() {
  const [data, setData] = useState<AdminTemplatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [page, setPage] = useState(1);

  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: "20",
      };
      if (search) params.search = search;
      if (category) params.category = category;
      if (syncStatus) params.syncStatus = syncStatus;

      const res = await getAdminTemplates(params);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [page, search, category, syncStatus]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleSync(id: string) {
    setSyncingIds((prev) => new Set(prev).add(id));
    setSyncResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      const result = await syncTemplate(id);
      setSyncResults((prev) => ({
        ...prev,
        [id]: {
          ok: result.success,
          message: result.success ? "Синхронізовано" : result.error || "Помилка",
        },
      }));
      // Refresh list
      fetchTemplates();
    } catch (err) {
      setSyncResults((prev) => ({
        ...prev,
        [id]: {
          ok: false,
          message: err instanceof Error ? err.message : "Помилка синхронізації",
        },
      }));
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchTemplates();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Шаблони воркфлоу</h1>
          <p className="mt-1 text-gray-600">
            Управління шаблонами каталогу
          </p>
        </div>
        <Link href="/admin/workflows/new">
          <Button>
            <Plus className="h-4 w-4" />
            Додати шаблон
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <Input
            placeholder="Пошук за назвою..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button type="submit" variant="outline" size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Input
          placeholder="Категорія"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="w-48"
        />

        <div className="flex gap-1">
          {SYNC_STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setSyncStatus(f.value);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                syncStatus === f.value
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
        <p className="mt-8 text-gray-500">Шаблонів не знайдено.</p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Назва</th>
                  <th className="px-4 py-3 font-medium">Категорія</th>
                  <th className="px-4 py-3 font-medium">Версія</th>
                  <th className="px-4 py-3 font-medium">Статус синхр.</th>
                  <th className="px-4 py-3 font-medium">JSON URL</th>
                  <th className="px-4 py-3 font-medium">Дії</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((tpl) => (
                  <tr
                    key={tpl.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {tpl.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{tpl.category}</td>
                    <td className="px-4 py-3 text-gray-600">v{tpl.version}</td>
                    <td className="px-4 py-3">
                      <Badge variant={syncBadgeVariant[tpl.syncStatus] ?? "secondary"}>
                        {tpl.syncStatus}
                      </Badge>
                      {syncResults[tpl.id] && (
                        <span
                          className={`ml-2 text-xs ${
                            syncResults[tpl.id].ok
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {syncResults[tpl.id].message}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {tpl.jsonUrl ? (
                        <a
                          href={tpl.jsonUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          URL
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/workflows/${tpl.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        {tpl.jsonUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={syncingIds.has(tpl.id)}
                            onClick={() => handleSync(tpl.id)}
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${
                                syncingIds.has(tpl.id) ? "animate-spin" : ""
                              }`}
                            />
                          </Button>
                        )}
                      </div>
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
