"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getApiKeys, createApiKey, deleteApiKey } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Key,
  Copy,
  Trash2,
  Plus,
  Loader2,
  AlertTriangle,
  Check,
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export default function ApiKeysSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getApiKeys()
      .then(setApiKeys)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  function showMsg(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleCreateKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await createApiKey({ name: newKeyName });
      setCreatedKey(res.key);
      setNewKeyName("");
      const keys = await getApiKeys();
      setApiKeys(keys);
      showMsg("success", "Ключ створено. Збережіть його — він більше не буде показаний.");
    } catch (e: any) {
      showMsg("error", e.message || "Помилка створення ключа");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteKey(id: string) {
    if (!confirm("Видалити цей API ключ?")) return;
    try {
      await deleteApiKey(id);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      showMsg("success", "Ключ видалено");
    } catch (e: any) {
      showMsg("error", e.message);
    }
  }

  function handleCopyKey() {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  if (authLoading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-lg p-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API ключі
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Created key banner */}
          {createdKey && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">
                    Новий ключ створено. Збережіть його зараз — він більше не буде показаний:
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 break-all rounded bg-white px-3 py-2 text-xs text-gray-800">
                      {createdKey}
                    </code>
                    <Button variant="outline" size="sm" onClick={handleCopyKey}>
                      {copiedKey ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create new key */}
          <div className="flex gap-2">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Назва ключа"
              onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
            />
            <Button onClick={handleCreateKey} disabled={creating || !newKeyName.trim()}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Створити
            </Button>
          </div>

          {/* Keys list */}
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Завантаження...
            </div>
          ) : apiKeys.length === 0 ? (
            <p className="text-sm text-gray-500">Немає API ключів</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{k.name}</p>
                      {k.scopes && k.scopes.length > 0 && (
                        <div className="flex gap-1">
                          {k.scopes.map((scope) => (
                            <Badge key={scope} variant="secondary">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>Префікс: {k.keyPrefix}...</span>
                      <span>Створено: {new Date(k.createdAt).toLocaleDateString("uk-UA")}</span>
                      {k.lastUsedAt && (
                        <span>
                          Останнє використання: {new Date(k.lastUsedAt).toLocaleDateString("uk-UA")}
                        </span>
                      )}
                      {k.expiresAt && (
                        <span>
                          Закінчується: {new Date(k.expiresAt).toLocaleDateString("uk-UA")}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(k.id)}
                    className="ml-4 rounded-lg p-2 text-red-500 hover:bg-red-50"
                    title="Видалити"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
