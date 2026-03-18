"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  getCredentials,
  createCredential,
  deleteCredential as apiDeleteCredential,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Key, Plus, Trash2 } from "lucide-react";

const SERVICE_TYPES = [
  "openai",
  "gmail",
  "slack",
  "instagram",
  "facebook",
  "twitter",
  "telegram",
  "stripe",
  "shopify",
  "hubspot",
  "salesforce",
  "jira",
  "github",
  "notion",
  "google_sheets",
  "google_analytics",
  "mailchimp",
  "sendgrid",
  "twilio",
  "aws_s3",
  "dropbox",
  "trello",
  "asana",
  "airtable",
  "firebase",
];

interface Credential {
  id: string;
  name: string;
  service: string;
  createdAt: string;
}

export default function CredentialsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState("");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  function loadCredentials() {
    if (!user) return;
    getCredentials()
      .then((data) => setCredentials(data as Credential[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data: Record<string, string> = { api_key: apiKey };
      if (apiSecret) data.api_secret = apiSecret;
      await createCredential({ name, serviceType, data });
      setAddDialogOpen(false);
      setServiceType("");
      setName("");
      setApiKey("");
      setApiSecret("");
      loadCredentials();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await apiDeleteCredential(deleteId);
      setCredentials((prev) => prev.filter((c) => c.id !== deleteId));
    } catch {
      // handle silently
    } finally {
      setDeleteDialogOpen(false);
      setDeleteId(null);
    }
  }

  if (authLoading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Мої облікові дані
        </h1>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Додати облікові дані
        </Button>
      </div>

      {loading ? (
        <p className="mt-8 text-gray-500">Завантаження...</p>
      ) : credentials.length === 0 ? (
        <div className="mt-12 rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Key className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">
            У вас ще немає збережених облікових даних
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Додайте API-ключі для використання у воркфлоу
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {credentials.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                  <Key className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-sm capitalize text-gray-500">
                    {c.service} &middot; Додано{" "}
                    {new Date(c.createdAt).toLocaleDateString("uk-UA")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDeleteId(c.id);
                  setDeleteDialogOpen(true);
                }}
                className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                title="Видалити"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Додати облікові дані</DialogTitle>
        <DialogDescription>
          Введіть API-ключі для сервісу, який ви хочете підключити.
        </DialogDescription>
        <form onSubmit={handleAdd} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Сервіс
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              required
            >
              <option value="">Оберіть сервіс...</option>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Назва"
            placeholder="Наприклад: Мій OpenAI ключ"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="API Key"
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono"
            required
          />
          <Input
            label="API Secret (опціонально)"
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            className="font-mono"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              Скасувати
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Збереження..." : "Зберегти"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Видалити облікові дані?</DialogTitle>
        <DialogDescription>
          Ця дія незворотна. Воркфлоу, що використовують ці дані, перестануть
          працювати.
        </DialogDescription>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
          >
            Скасувати
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Видалити
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
