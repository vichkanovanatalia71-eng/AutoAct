"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
  getAdminTemplate,
  updateAdminTemplate,
  deleteAdminTemplate,
  syncTemplate,
  previewTemplateUrl,
  getSyncLogs,
  type AdminTemplate,
  type PreviewResult,
  type SyncLog,
  type SyncChanges,
} from "@/lib/admin-api";
import {
  ArrowLeft,
  FileJson,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Trash2,
  Clock,
} from "lucide-react";

type JsonSource = "url" | "manual";

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [template, setTemplate] = useState<AdminTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");

  const [jsonSource, setJsonSource] = useState<JsonSource>("url");
  const [jsonUrl, setJsonUrl] = useState("");
  const [jsonManual, setJsonManual] = useState("");

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    ok: boolean;
    message: string;
    changes?: SyncChanges;
  } | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTemplate = useCallback(async () => {
    try {
      const tpl = await getAdminTemplate(id);
      setTemplate(tpl);
      setName(tpl.name);
      setCategory(tpl.category);
      setTags(tpl.tags.join(", "));
      setDescription(tpl.description);
      if (tpl.jsonUrl) {
        setJsonSource("url");
        setJsonUrl(tpl.jsonUrl);
      } else if (tpl.jsonDefinition) {
        setJsonSource("manual");
        setJsonManual(JSON.stringify(tpl.jsonDefinition, null, 2));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await getSyncLogs({
        templateId: id,
        limit: "5",
        sort: "desc",
      });
      setSyncLogs(res.data);
    } catch {
      // silently ignore
    }
  }, [id]);

  useEffect(() => {
    fetchTemplate();
    fetchLogs();
  }, [fetchTemplate, fetchLogs]);

  async function handlePreview() {
    if (!jsonUrl.trim()) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    try {
      const result = await previewTemplateUrl(jsonUrl.trim());
      setPreview(result);
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : "Не вдалося отримати дані з URL"
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncTemplate(id);
      setSyncResult({
        ok: result.success,
        message: result.success
          ? "Синхронізовано успішно"
          : result.error || "Помилка",
        changes: result.changes,
      });
      fetchTemplate();
      fetchLogs();
    } catch (err) {
      setSyncResult({
        ok: false,
        message: err instanceof Error ? err.message : "Помилка синхронізації",
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Назва обов'язкова");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: Parameters<typeof updateAdminTemplate>[1] = {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (jsonSource === "url" && jsonUrl.trim()) {
        payload.jsonUrl = jsonUrl.trim();
      } else if (jsonSource === "manual" && jsonManual.trim()) {
        try {
          payload.jsonDefinition = JSON.parse(jsonManual);
        } catch {
          setError("Невалідний JSON");
          setSaving(false);
          return;
        }
      }

      await updateAdminTemplate(id, payload);
      router.push("/admin/workflows");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAdminTemplate(id);
      router.push("/admin/workflows");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка видалення");
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  const logStatusVariant: Record<
    string,
    "success" | "destructive" | "secondary"
  > = {
    success: "success",
    error: "destructive",
    no_change: "secondary",
  };

  const logStatusLabel: Record<string, string> = {
    success: "Успіх",
    error: "Помилка",
    no_change: "Без змін",
  };

  if (loading) {
    return <p className="text-gray-500">Завантаження...</p>;
  }

  if (loadError || !template) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        <p>{loadError || "Шаблон не знайдено"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/workflows"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до списку
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Редагувати шаблон
          </h1>
          <p className="mt-1 text-gray-600">
            Версія: {template.version} | Статус синхр.:{" "}
            <Badge
              variant={
                template.syncStatus === "error"
                  ? "destructive"
                  : template.syncStatus === "syncing"
                    ? "default"
                    : "secondary"
              }
            >
              {template.syncStatus}
            </Badge>
          </p>
        </div>
        <div className="flex gap-2">
          {template.jsonUrl && (
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw
                className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
              />
              Синхронізувати зараз
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Видалити
          </Button>
        </div>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div
          className={`mt-4 rounded-lg p-4 text-sm ${
            syncResult.ok
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {syncResult.ok ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {syncResult.message}
          </div>
          {syncResult.changes && (
            <div className="mt-2 space-y-1 text-xs">
              {syncResult.changes.nodesAdded?.length ? (
                <p>
                  + Додано вузлів: {syncResult.changes.nodesAdded.join(", ")}
                </p>
              ) : null}
              {syncResult.changes.nodesRemoved?.length ? (
                <p>
                  - Видалено вузлів:{" "}
                  {syncResult.changes.nodesRemoved.join(", ")}
                </p>
              ) : null}
              {syncResult.changes.credentialsAdded?.length ? (
                <p>
                  + Додано credentials:{" "}
                  {syncResult.changes.credentialsAdded.join(", ")}
                </p>
              ) : null}
              {syncResult.changes.credentialsRemoved?.length ? (
                <p>
                  - Видалено credentials:{" "}
                  {syncResult.changes.credentialsRemoved.join(", ")}
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle>Основна інформація</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Назва"
              placeholder="Назва шаблону"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Категорія"
              placeholder="напр. marketing, sales, support"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Input
              label="Теги"
              placeholder="тег1, тег2, тег3 (через кому)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Опис
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="Опис шаблону..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* JSON Source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              JSON Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="jsonSource"
                  checked={jsonSource === "url"}
                  onChange={() => setJsonSource("url")}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  JSON URL
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="jsonSource"
                  checked={jsonSource === "manual"}
                  onChange={() => setJsonSource("manual")}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Вставити вручну
                </span>
              </label>
            </div>

            {jsonSource === "url" ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/workflow.json"
                    value={jsonUrl}
                    onChange={(e) => setJsonUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreview}
                    disabled={!jsonUrl.trim() || previewLoading}
                  >
                    {previewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Перевірити URL
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  JSON визначення
                </label>
                <textarea
                  className="flex min-h-[200px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder='{"nodes": [...], "required_credentials": [...]}'
                  value={jsonManual}
                  onChange={(e) => setJsonManual(e.target.value)}
                />
              </div>
            )}

            {/* Preview error */}
            {previewError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {previewError}
              </div>
            )}

            {/* Preview result */}
            {preview && (
              <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  URL перевірено успішно
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Required Credentials
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {preview.requiredCredentials.length > 0 ? (
                      preview.requiredCredentials.map((cred) => (
                        <Badge key={cred} variant="outline">
                          {cred}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">
                        Не потрібні
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Вузли ({preview.nodes.length})
                  </p>
                  <ul className="mt-1 space-y-1">
                    {preview.nodes.map((node) => (
                      <li
                        key={node.id}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <span className="inline-block h-2 w-2 rounded-full bg-primary-400" />
                        <span className="font-medium">{node.label}</span>
                        <span className="text-gray-400">({node.type})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current template data (read-only) */}
        {template.requiredCredentials.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Поточні credentials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {template.requiredCredentials.map((cred) => (
                  <Badge key={cred} variant="outline">
                    {cred}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {template.nodes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Поточні вузли ({template.nodes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {template.nodes.map((node) => (
                  <li
                    key={node.id}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <span className="inline-block h-2 w-2 rounded-full bg-primary-400" />
                    <span className="font-medium">{node.label}</span>
                    <span className="text-gray-400">({node.type})</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Sync history */}
        {syncLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Історія синхронізацій
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 pr-4 font-medium">Статус</th>
                      <th className="pb-2 pr-4 font-medium">Зміни</th>
                      <th className="pb-2 font-medium">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="py-2 pr-4">
                          <Badge
                            variant={
                              logStatusVariant[log.status] ?? "secondary"
                            }
                          >
                            {logStatusLabel[log.status] ?? log.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 text-gray-600">
                          {log.changes
                            ? [
                                log.changes.nodesAdded?.length &&
                                  `+${log.changes.nodesAdded.length} вузлів`,
                                log.changes.nodesRemoved?.length &&
                                  `-${log.changes.nodesRemoved.length} вузлів`,
                                log.changes.credentialsAdded?.length &&
                                  `+${log.changes.credentialsAdded.length} cred`,
                                log.changes.credentialsRemoved?.length &&
                                  `-${log.changes.credentialsRemoved.length} cred`,
                              ]
                                .filter(Boolean)
                                .join(", ") || "---"
                            : log.error || "---"}
                        </td>
                        <td className="py-2 text-gray-600">
                          {new Date(log.createdAt).toLocaleString("uk-UA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/admin/workflows">
            <Button type="button" variant="outline">
              Скасувати
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Зберегти
          </Button>
        </div>
      </form>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Видалити шаблон?</DialogTitle>
        <DialogDescription>
          Ви впевнені, що хочете видалити шаблон &quot;{template.name}&quot;? Цю
          дію не можна скасувати.
        </DialogDescription>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Скасувати
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Видалити
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
