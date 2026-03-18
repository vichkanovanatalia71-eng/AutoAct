"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  changePassword,
  setup2FA,
  verify2FA,
  disable2FA,
  getSessions,
  revokeSession,
  revokeOtherSessions,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Loader2,
  Monitor,
  Smartphone,
  Globe,
  Trash2,
  XCircle,
} from "lucide-react";

interface Session {
  id: string;
  device: string;
  ip: string;
  location?: string;
  lastActive: string;
  current: boolean;
}

function mapSession(raw: any): Session {
  return {
    id: raw.id,
    device: raw.deviceName || raw.userAgent || "Невідомий пристрій",
    ip: raw.ipAddress || "—",
    lastActive: raw.lastActiveAt || raw.createdAt,
    current: raw.isCurrent || false,
  };
}

export default function SecuritySettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // 2FA
  const [twoFASecret, setTwoFASecret] = useState<string | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingAll, setRevokingAll] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getSessions()
      .then((data: any[]) => setSessions(data.map(mapSession)))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, [user]);

  function showMsg(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleChangePassword() {
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      showMsg("success", "Пароль змінено");
    } catch (e: any) {
      showMsg("error", e.message || "Помилка зміни пароля");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSetup2FA() {
    try {
      const res = await setup2FA();
      setTwoFASecret(res.secret);
    } catch (e: any) {
      showMsg("error", e.message);
    }
  }

  async function handleVerify2FA() {
    try {
      await verify2FA(twoFACode);
      setTwoFAEnabled(true);
      setTwoFASecret(null);
      setTwoFACode("");
      showMsg("success", "2FA увімкнено");
    } catch (e: any) {
      showMsg("error", e.message);
    }
  }

  async function handleDisable2FA() {
    try {
      await disable2FA(disableCode);
      setTwoFAEnabled(false);
      setDisableCode("");
      showMsg("success", "2FA вимкнено");
    } catch (e: any) {
      showMsg("error", e.message);
    }
  }

  async function handleRevokeSession(id: string) {
    try {
      await revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      showMsg("success", "Сесію завершено");
    } catch (e: any) {
      showMsg("error", e.message);
    }
  }

  async function handleRevokeOthers() {
    setRevokingAll(true);
    try {
      await revokeOtherSessions();
      setSessions((prev) => prev.filter((s) => s.current));
      showMsg("success", "Інші сесії завершено");
    } catch (e: any) {
      showMsg("error", e.message);
    } finally {
      setRevokingAll(false);
    }
  }

  if (authLoading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  const deviceIcon = (device: string) => {
    const d = device.toLowerCase();
    if (d.includes("mobile") || d.includes("phone") || d.includes("android") || d.includes("ios")) {
      return <Smartphone className="h-4 w-4" />;
    }
    if (d.includes("desktop") || d.includes("windows") || d.includes("mac") || d.includes("linux")) {
      return <Monitor className="h-4 w-4" />;
    }
    return <Globe className="h-4 w-4" />;
  };

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

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Змінити пароль
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Поточний пароль</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Новий пароль</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={savingPassword}>
            {savingPassword ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Збереження...
              </>
            ) : (
              "Змінити пароль"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 2FA */}
      <Card>
        <CardHeader>
          <CardTitle>Двофакторна автентифікація (2FA)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {twoFAEnabled ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="success">Увімкнено</Badge>
                <span className="text-sm text-green-700">2FA активна</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Код для вимкнення
                </label>
                <Input
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  className="mt-1"
                  placeholder="000000"
                />
              </div>
              <Button variant="outline" onClick={handleDisable2FA}>
                Вимкнути 2FA
              </Button>
            </div>
          ) : twoFASecret ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Введіть секрет у ваш TOTP-додаток:
              </p>
              <code className="block break-all rounded bg-gray-100 p-2 text-sm">
                {twoFASecret}
              </code>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Код підтвердження
                </label>
                <Input
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value)}
                  className="mt-1"
                  placeholder="000000"
                />
              </div>
              <Button onClick={handleVerify2FA}>Підтвердити та увімкнути</Button>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm text-gray-600">
                Увімкніть двофакторну автентифікацію для додаткового захисту вашого акаунту.
              </p>
              <Button onClick={handleSetup2FA}>Налаштувати 2FA</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Активні сесії</CardTitle>
            {sessions.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevokeOthers}
                disabled={revokingAll}
              >
                {revokingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Завершити інші
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Завантаження...
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-500">Немає активних сесій</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-500">{deviceIcon(session.device)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{session.device}</p>
                        {session.current && (
                          <Badge variant="success">Поточна</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {session.ip}
                        {session.location ? ` - ${session.location}` : ""}
                        {" | "}
                        Остання активність: {new Date(session.lastActive).toLocaleString("uk-UA")}
                      </p>
                    </div>
                  </div>
                  {!session.current && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      title="Завершити сесію"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
