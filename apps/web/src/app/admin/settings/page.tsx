"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  getAdminSettings,
  updateAdminSettings,
  type AdminSettings,
} from "@/lib/admin-api";
import {
  Settings,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Info,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [syncInterval, setSyncInterval] = useState("15");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await getAdminSettings();
        setSettings(res);
        setSyncInterval(String(res.syncIntervalMinutes));
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Помилка завантаження"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const minutes = parseInt(syncInterval, 10);
    if (isNaN(minutes) || minutes < 1) {
      setSaveError("Інтервал має бути числом більше 0");
      setSaving(false);
      return;
    }

    try {
      const updated = await updateAdminSettings({
        syncIntervalMinutes: minutes,
      });
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-gray-500">Завантаження...</p>;
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        <p>{loadError}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Налаштування</h1>
      <p className="mt-1 text-gray-600">
        Загальні налаштування адміністратора
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Синхронізація шаблонів
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Інтервал синхронізації (хвилини)"
              type="number"
              min="1"
              value={syncInterval}
              onChange={(e) => setSyncInterval(e.target.value)}
              placeholder="15"
            />

            <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p>
                  Система автоматично перевіряє оновлення шаблонів за вказаним
                  інтервалом. Для кожного шаблону з JSON URL виконується запит до
                  зовнішнього джерела. Якщо структура змінилася, шаблон
                  оновлюється, а результат записується до журналу синхронізацій.
                </p>
                <p className="mt-2">
                  Поточний інтервал:{" "}
                  <span className="font-medium">
                    {settings?.syncIntervalMinutes ?? 15} хв
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-3">
            {saveError && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Збережено
              </div>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              Зберегти
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
