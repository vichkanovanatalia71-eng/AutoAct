"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createAdminTemplate,
  previewTemplateUrl,
  type PreviewResult,
} from "@/lib/admin-api";
import {
  ArrowLeft,
  FileJson,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

type JsonSource = "url" | "manual";

export default function NewTemplatePage() {
  const router = useRouter();

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Назва обов'язкова");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: Parameters<typeof createAdminTemplate>[0] = {
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

      await createAdminTemplate(payload);
      router.push("/admin/workflows");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
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

      <h1 className="text-2xl font-bold text-gray-900">Новий шаблон</h1>
      <p className="mt-1 text-gray-600">
        Створіть новий шаблон воркфлоу для каталогу
      </p>

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
                <p className="text-xs text-gray-500">
                  Шаблон буде автоматично синхронізуватися з цього URL
                </p>
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

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Тип тригера
                  </p>
                  <p className="mt-0.5 text-sm text-gray-700">
                    {preview.triggerType}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
    </div>
  );
}
