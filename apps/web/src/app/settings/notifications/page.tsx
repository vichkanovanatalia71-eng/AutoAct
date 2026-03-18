"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { updateNotificationPrefs } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bell, Mail, Monitor, Smartphone, Loader2 } from "lucide-react";

export default function NotificationsSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [emailNotif, setEmailNotif] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);

  // Granular controls
  const [execFailEmail, setExecFailEmail] = useState(true);
  const [execFailInApp, setExecFailInApp] = useState(true);
  const [usageLimitEmail, setUsageLimitEmail] = useState(true);
  const [usageLimitInApp, setUsageLimitInApp] = useState(true);
  const [billingEmail, setBillingEmail] = useState(true);
  const [billingInApp, setBillingInApp] = useState(true);
  const [securityEmail, setSecurityEmail] = useState(true);
  const [securityInApp, setSecurityInApp] = useState(true);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
  }, [user, authLoading, router]);

  function showMsg(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateNotificationPrefs({
        email: emailNotif,
        inApp: inAppNotif,
      });
      showMsg("success", "Налаштування сповіщень збережено");
    } catch (e: any) {
      showMsg("error", e.message || "Помилка збереження");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  function Toggle({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: (val: boolean) => void;
    label: string;
  }) {
    return (
      <label className="flex cursor-pointer items-center justify-between">
        <span className="text-sm text-gray-700">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            checked ? "bg-primary-600" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </label>
    );
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

      {/* Global channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Канали сповіщень
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4">
            <Mail className="h-5 w-5 text-gray-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Email сповіщення</p>
              <p className="text-xs text-gray-500">Отримуйте сповіщення на вашу пошту</p>
            </div>
            <Toggle checked={emailNotif} onChange={setEmailNotif} label="" />
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4">
            <Monitor className="h-5 w-5 text-gray-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">In-app сповіщення</p>
              <p className="text-xs text-gray-500">Сповіщення всередині додатку</p>
            </div>
            <Toggle checked={inAppNotif} onChange={setInAppNotif} label="" />
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4">
            <Smartphone className="h-5 w-5 text-gray-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Push-сповіщення</p>
              <p className="text-xs text-gray-500">Сповіщення у браузері</p>
            </div>
            <Toggle checked={pushNotif} onChange={setPushNotif} label="" />
          </div>
        </CardContent>
      </Card>

      {/* Granular notification types */}
      <Card>
        <CardHeader>
          <CardTitle>Типи сповіщень</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">Подія</th>
                  <th className="pb-3 text-center font-medium">Email</th>
                  <th className="pb-3 text-center font-medium">In-app</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 text-gray-900">Помилка виконання</td>
                  <td className="py-3 text-center">
                    <input
                      type="checkbox"
                      checked={execFailEmail}
                      onChange={(e) => setExecFailEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="py-3 text-center">
                    <input
                      type="checkbox"
                      checked={execFailInApp}
                      onChange={(e) => setExecFailInApp(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-900">Ліміт використання</td>
                  <td className="py-3 text-center">
                    <input
                      type="checkbox"
                      checked={usageLimitEmail}
                      onChange={(e) => setUsageLimitEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="py-3 text-center">
                    <input
                      type="checkbox"
                      checked={usageLimitInApp}
                      onChange={(e) => setUsageLimitInApp(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-900">Білінг та оплата</td>
                  <td className="py-3 text-center">
                    <input
                      type="checkbox"
                      checked={billingEmail}
                      onChange={(e) => setBillingEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="py-3 text-center">
                    <input
                      type="checkbox"
                      checked={billingInApp}
                      onChange={(e) => setBillingInApp(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-900">Безпека (вхід, 2FA)</td>
                  <td className="py-3 text-center">
                    <input
                      type="checkbox"
                      checked={securityEmail}
                      onChange={(e) => setSecurityEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="py-3 text-center">
                    <input
                      type="checkbox"
                      checked={securityInApp}
                      onChange={(e) => setSecurityInApp(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Збереження...
          </>
        ) : (
          "Зберегти налаштування"
        )}
      </Button>
    </div>
  );
}
