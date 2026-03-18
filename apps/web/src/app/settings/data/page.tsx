"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { exportAccount, deleteAccount } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Database,
  Download,
  AlertTriangle,
  Trash2,
  Loader2,
} from "lucide-react";

export default function DataSettingsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
  }, [user, authLoading, router]);

  function showMsg(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportAccount();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "autoact-export.json";
      a.click();
      URL.revokeObjectURL(url);
      showMsg("success", "Дані експортовано");
    } catch (e: any) {
      showMsg("error", e.message || "Помилка експорту");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "ВИДАЛИТИ") {
      showMsg("error", "Введіть ВИДАЛИТИ для підтвердження");
      return;
    }
    if (!confirm("Ви впевнені? Цю дію неможливо скасувати. Всі ваші дані будуть видалені назавжди.")) {
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount();
      logout();
      router.push("/");
    } catch (e: any) {
      showMsg("error", e.message || "Помилка видалення акаунту");
      setDeleting(false);
    }
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

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Експорт даних
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-600">
            Завантажте всі ваші дані (воркфлоу, виконання, налаштування, облікові дані) у форматі JSON.
            Це дозволяє зберегти копію ваших даних або перенести їх на інший акаунт.
          </p>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Експортування...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Експортувати дані
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="h-5 w-5" />
            Видалення акаунту
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Ця дія незворотна. Усі ваші дані, воркфлоу, облікові дані та історія виконань будуть
                видалені назавжди. Якщо у вас є активна підписка, вона буде скасована.
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-red-700">
                    Введіть ВИДАЛИТИ для підтвердження
                  </label>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="mt-1 border-red-300 focus:border-red-500 focus:ring-red-500/20"
                    placeholder="ВИДАЛИТИ"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirm !== "ВИДАЛИТИ"}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Видалення...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Видалити акаунт назавжди
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
