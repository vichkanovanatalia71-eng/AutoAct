"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getNativeNode,
  updateNativeNode,
  deleteNativeNode,
  testNativeNode,
  type NativeNodeDetail,
} from "@/lib/admin-api";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Play,
  Save,
  Trash2,
  Sparkles,
  XCircle,
} from "lucide-react";

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

export default function NodeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params.nodeId as string;

  const [node, setNode] = useState<NativeNodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [executorCode, setExecutorCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [replaces, setReplaces] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    passed: number;
    failed: number;
    total: number;
    errors: string[];
  } | null>(null);

  const [deleting, setDeleting] = useState(false);

  const fetchNode = useCallback(async () => {
    try {
      const data = await getNativeNode(nodeId);
      setNode(data);
      setExecutorCode(data.executorCode);
      setName(data.name);
      setCategory(data.category);
      setReplaces(data.replaces.join(", "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    fetchNode();
  }, [fetchNode]);

  async function handleSave() {
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      await updateNativeNode(nodeId, {
        name,
        category,
        replaces: replaces
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        executorCode,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const result = await testNativeNode(nodeId);
      setTestResult(result);
      if (result.failed === 0 && result.passed > 0) {
        // Refresh node data — status may have changed to active
        fetchNode();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка тестування");
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Видалити цей вузол?")) return;
    setDeleting(true);
    try {
      await deleteNativeNode(nodeId, true);
      router.push("/admin/node-library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка видалення");
      setDeleting(false);
    }
  }

  async function handleActivate() {
    try {
      await updateNativeNode(nodeId, { status: "active" });
      fetchNode();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка");
    }
  }

  async function handleDeprecate() {
    try {
      await updateNativeNode(nodeId, { status: "deprecated" });
      fetchNode();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        <p>{error || "Вузол не знайдено"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/node-library"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до бібліотеки
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{node.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <code className="text-sm text-gray-500">{node.nodeId}</code>
            <Badge variant={statusVariant[node.status] || "secondary"}>
              {statusLabel[node.status] || node.status}
            </Badge>
            {node.isAiGenerated && (
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {node.status === "needs_review" && (
            <Button variant="default" size="sm" onClick={handleActivate}>
              Активувати
            </Button>
          )}
          {node.status === "active" && (
            <Button variant="outline" size="sm" onClick={handleDeprecate}>
              Деактивувати
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Видалити
          </Button>
        </div>
      </div>

      {/* Needs review banner */}
      {node.status === "needs_review" && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Цей вузол потребує перевірки перед активацією. Перевірте код і запустіть тести.
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Збережено успішно
        </div>
      )}

      <div className="mt-6 space-y-6">
        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Метадані</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Назва"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Категорія"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Input
              label="Замінює (через кому)"
              value={replaces}
              onChange={(e) => setReplaces(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Code editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Код виконавця</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  Запустити тести
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  Зберегти
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-gray-500">
              Тіло функції <code>async function execute(input, config)</code>:
            </p>
            <textarea
              className="w-full min-h-[300px] rounded-lg border border-gray-300 bg-gray-900 p-4 font-mono text-sm text-green-400 placeholder:text-gray-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              value={executorCode}
              onChange={(e) => setExecutorCode(e.target.value)}
              spellCheck={false}
            />
          </CardContent>
        </Card>

        {/* Test results */}
        {testResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Результати тестів
                {testResult.failed === 0 && testResult.passed > 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 text-sm">
                <div className="text-green-600 font-medium">
                  Пройшло: {testResult.passed}
                </div>
                <div className="text-red-600 font-medium">
                  Не пройшло: {testResult.failed}
                </div>
                <div className="text-gray-500">
                  Всього: {testResult.total}
                </div>
              </div>
              {testResult.errors.length > 0 && (
                <div className="mt-3 space-y-1">
                  {testResult.errors.map((err, i) => (
                    <div
                      key={i}
                      className="rounded bg-red-50 p-2 font-mono text-xs text-red-700"
                    >
                      {err}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Schemas */}
        <Card>
          <CardHeader>
            <CardTitle>Схеми</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-700">Input Schema</p>
              <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs">
                {JSON.stringify(node.inputSchema, null, 2)}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-gray-700">Output Schema</p>
              <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs">
                {JSON.stringify(node.outputSchema, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Test cases */}
        {node.testCases && Array.isArray(node.testCases) && node.testCases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Тест-кейси ({node.testCases.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {node.testCases.map((tc: any, i: number) => (
                  <div key={i} className="rounded-lg border border-gray-200 p-3">
                    <p className="text-xs font-medium text-gray-500">
                      Тест #{i + 1}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Input:</p>
                        <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs">
                          {JSON.stringify(tc.input, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Expected Output:</p>
                        <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs">
                          {JSON.stringify(tc.expected_output, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
