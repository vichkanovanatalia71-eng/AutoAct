"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getNativeNodes,
  createNativeNode,
  type NativeNodeSummary,
} from "@/lib/admin-api";
import {
  Loader2,
  Plus,
  Search,
  Sparkles,
  Box,
} from "lucide-react";

const CATEGORIES = ["Documents", "Media", "Data", "Communication", "AI Generated", "Інше"];
const STATUSES = ["active", "needs_review", "deprecated"];

const statusVariant: Record<string, "success" | "destructive" | "secondary" | "default"> = {
  active: "success",
  needs_review: "default",
  deprecated: "secondary",
};

const statusLabel: Record<string, string> = {
  active: "Активний",
  needs_review: "Потребує перевірки",
  deprecated: "Застарілий",
};

export default function NodeLibraryPage() {
  const [nodes, setNodes] = useState<NativeNodeSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newNode, setNewNode] = useState({
    nodeId: "",
    name: "",
    category: "Data",
    replaces: "",
    executorCode: "",
  });

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      if (category) params.category = category;
      if (status) params.status = status;
      const res = await getNativeNodes(params);
      setNodes(res.data);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, category, status]);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  async function handleCreate() {
    if (!newNode.nodeId || !newNode.name || !newNode.executorCode) {
      setCreateError("nodeId, назва та код обов'язкові");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createNativeNode({
        nodeId: newNode.nodeId,
        name: newNode.name,
        category: newNode.category,
        replaces: newNode.replaces
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        inputSchema: {},
        outputSchema: {},
        executorCode: newNode.executorCode,
      });
      setCreateOpen(false);
      setNewNode({ nodeId: "", name: "", category: "Data", replaces: "", executorCode: "" });
      fetchNodes();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Помилка створення");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Бібліотека нативних вузлів</h1>
          <p className="mt-1 text-gray-600">
            {total} вузлів у бібліотеці
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Додати вузол
        </Button>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Пошук за назвою або ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Всі категорії</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Всі статуси</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel[s] || s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card className="mt-6">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
              <Box className="h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm">Вузлів не знайдено</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="p-4 font-medium">Назва</th>
                    <th className="p-4 font-medium">ID</th>
                    <th className="p-4 font-medium">Категорія</th>
                    <th className="p-4 font-medium">Замінює</th>
                    <th className="p-4 font-medium">Статус</th>
                    <th className="p-4 font-medium">AI</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((node) => (
                    <tr
                      key={node.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="p-4">
                        <Link
                          href={`/admin/node-library/${node.nodeId}`}
                          className="font-medium text-primary-600 hover:underline"
                        >
                          {node.name}
                        </Link>
                      </td>
                      <td className="p-4 font-mono text-xs text-gray-500">
                        {node.nodeId}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{node.category}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {node.replaces.slice(0, 3).map((r) => (
                            <Badge key={r} variant="secondary" className="text-xs">
                              {r}
                            </Badge>
                          ))}
                          {node.replaces.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{node.replaces.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={statusVariant[node.status] || "secondary"}>
                          {statusLabel[node.status] || node.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {node.isAiGenerated && (
                          <Sparkles className="h-4 w-4 text-amber-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 50 && (
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Попередня
          </Button>
          <span className="flex items-center text-sm text-gray-500">
            Сторінка {page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={nodes.length < 50}
            onClick={() => setPage((p) => p + 1)}
          >
            Наступна
          </Button>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogTitle>Додати нативний вузол</DialogTitle>
        <DialogDescription>
          Створіть новий нативний вузол вручну
        </DialogDescription>
        <div className="mt-4 space-y-4">
          <Input
            label="Node ID"
            placeholder="my_custom_node"
            value={newNode.nodeId}
            onChange={(e) => setNewNode((n) => ({ ...n, nodeId: e.target.value }))}
          />
          <Input
            label="Назва"
            placeholder="Назва вузла"
            value={newNode.name}
            onChange={(e) => setNewNode((n) => ({ ...n, name: e.target.value }))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Категорія
            </label>
            <select
              value={newNode.category}
              onChange={(e) => setNewNode((n) => ({ ...n, category: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Замінює (через кому)"
            placeholder="sendgrid, mailgun"
            value={newNode.replaces}
            onChange={(e) => setNewNode((n) => ({ ...n, replaces: e.target.value }))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Код виконавця
            </label>
            <textarea
              className="flex min-h-[150px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="// Тіло функції execute(input, config)..."
              value={newNode.executorCode}
              onChange={(e) => setNewNode((n) => ({ ...n, executorCode: e.target.value }))}
            />
          </div>
          {createError && (
            <p className="text-sm text-red-600">{createError}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)}>
            Скасувати
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            Створити
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
