"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  updateProfile,
  changePassword,
  updateNotificationPrefs,
  exportAccount,
  deleteAccount,
  getApiKeys,
  createApiKey,
  deleteApiKey,
  getReferralInfo,
  setup2FA,
  verify2FA,
  disable2FA,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  User,
  Shield,
  Bell,
  Key,
  Gift,
  Database,
  Copy,
  Trash2,
  Plus,
  AlertTriangle,
} from "lucide-react";

type Tab = "profile" | "security" | "notifications" | "api-keys" | "referral" | "data";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Профіль", icon: User },
  { id: "security", label: "Безпека", icon: Shield },
  { id: "notifications", label: "Сповіщення", icon: Bell },
  { id: "api-keys", label: "API ключі", icon: Key },
  { id: "referral", label: "Реферали", icon: Gift },
  { id: "data", label: "Дані", icon: Database },
];

export default function SettingsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile
  const [email, setEmail] = useState("");

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // 2FA
  const [twoFASecret, setTwoFASecret] = useState<string | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  // Notifications
  const [emailNotif, setEmailNotif] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);

  // API Keys
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; keyPrefix: string; createdAt: string }>>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  // Referral
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<Array<{ id: string; referredId?: string; createdAt: string }>>([]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) setEmail(user.email);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === "api-keys") {
      getApiKeys().then(setApiKeys).catch(() => {});
    }
    if (activeTab === "referral") {
      getReferralInfo()
        .then((r) => { setReferralCode(r.code); setReferrals(r.referrals); })
        .catch(() => {});
    }
  }, [activeTab, user]);

  function showMsg(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleUpdateProfile() {
    setSaving(true);
    try {
      await updateProfile({ email });
      showMsg("success", "Профіль оновлено");
    } catch (e: any) { showMsg("error", e.message); }
    finally { setSaving(false); }
  }

  async function handleChangePassword() {
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword(""); setNewPassword("");
      showMsg("success", "Пароль змінено");
    } catch (e: any) { showMsg("error", e.message); }
    finally { setSaving(false); }
  }

  async function handleSetup2FA() {
    try {
      const res = await setup2FA();
      setTwoFASecret(res.secret);
    } catch (e: any) { showMsg("error", e.message); }
  }

  async function handleVerify2FA() {
    try {
      await verify2FA(twoFACode);
      setTwoFAEnabled(true); setTwoFASecret(null); setTwoFACode("");
      showMsg("success", "2FA увімкнено");
    } catch (e: any) { showMsg("error", e.message); }
  }

  async function handleDisable2FA() {
    try {
      await disable2FA(disableCode);
      setTwoFAEnabled(false); setDisableCode("");
      showMsg("success", "2FA вимкнено");
    } catch (e: any) { showMsg("error", e.message); }
  }

  async function handleNotifPrefs() {
    try {
      await updateNotificationPrefs({ email: emailNotif, inApp: inAppNotif });
      showMsg("success", "Налаштування збережено");
    } catch (e: any) { showMsg("error", e.message); }
  }

  async function handleCreateKey() {
    if (!newKeyName.trim()) return;
    try {
      const res = await createApiKey({ name: newKeyName });
      setCreatedKey(res.key);
      setNewKeyName("");
      getApiKeys().then(setApiKeys);
      showMsg("success", "Ключ створено. Збережіть його — він більше не буде показаний.");
    } catch (e: any) { showMsg("error", e.message); }
  }

  async function handleDeleteKey(id: string) {
    try {
      await deleteApiKey(id);
      setApiKeys((k) => k.filter((x) => x.id !== id));
    } catch (e: any) { showMsg("error", e.message); }
  }

  async function handleExport() {
    try {
      const data = await exportAccount();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "autoact-export.json"; a.click();
      showMsg("success", "Дані експортовано");
    } catch (e: any) { showMsg("error", e.message); }
  }

  async function handleDeleteAccount() {
    if (!confirm("Ви впевнені? Цю дію неможливо скасувати.")) return;
    try {
      await deleteAccount();
      logout();
      router.push("/");
    } catch (e: any) { showMsg("error", e.message); }
  }

  if (authLoading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Налаштування</h1>

      {message && (
        <div className={`mt-4 rounded-lg p-3 text-sm ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <div className="w-full lg:w-56">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "profile" && (
            <Card>
              <CardHeader><CardTitle>Профіль</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
                </div>
                <Button onClick={handleUpdateProfile} disabled={saving}>
                  {saving ? "Збереження..." : "Зберегти"}
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Змінити пароль</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Поточний пароль</label>
                    <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Новий пароль</label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" />
                  </div>
                  <Button onClick={handleChangePassword} disabled={saving}>Змінити пароль</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Двофакторна автентифікація (2FA)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {twoFAEnabled ? (
                    <div className="space-y-3">
                      <p className="text-sm text-green-700">2FA увімкнено</p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Код для вимкнення</label>
                        <Input value={disableCode} onChange={(e) => setDisableCode(e.target.value)} className="mt-1" placeholder="000000" />
                      </div>
                      <Button variant="outline" onClick={handleDisable2FA}>Вимкнути 2FA</Button>
                    </div>
                  ) : twoFASecret ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">Введіть секрет у ваш TOTP-додаток:</p>
                      <code className="block rounded bg-gray-100 p-2 text-sm break-all">{twoFASecret}</code>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Код підтвердження</label>
                        <Input value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)} className="mt-1" placeholder="000000" />
                      </div>
                      <Button onClick={handleVerify2FA}>Підтвердити та увімкнути</Button>
                    </div>
                  ) : (
                    <Button onClick={handleSetup2FA}>Налаштувати 2FA</Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "notifications" && (
            <Card>
              <CardHeader><CardTitle>Сповіщення</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={emailNotif} onChange={(e) => setEmailNotif(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                  <span className="text-sm text-gray-700">Email сповіщення</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={inAppNotif} onChange={(e) => setInAppNotif(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                  <span className="text-sm text-gray-700">In-app сповіщення</span>
                </label>
                <Button onClick={handleNotifPrefs}>Зберегти</Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "api-keys" && (
            <Card>
              <CardHeader><CardTitle>API ключі</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {createdKey && (
                  <div className="rounded-lg bg-green-50 p-3">
                    <p className="text-sm font-medium text-green-800">Новий ключ (збережіть зараз):</p>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="flex-1 break-all text-xs">{createdKey}</code>
                      <button onClick={() => navigator.clipboard.writeText(createdKey)} className="text-green-600 hover:text-green-800">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Назва ключа" />
                  <Button onClick={handleCreateKey}><Plus className="h-4 w-4" /></Button>
                </div>
                {apiKeys.length === 0 ? (
                  <p className="text-sm text-gray-500">Немає API ключів</p>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((k) => (
                      <div key={k.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">{k.name}</p>
                          <p className="text-xs text-gray-500">{k.keyPrefix}... | {new Date(k.createdAt).toLocaleDateString("uk")}</p>
                        </div>
                        <button onClick={() => handleDeleteKey(k.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "referral" && (
            <Card>
              <CardHeader><CardTitle>Реферальна програма</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ваш реферальний код</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="rounded bg-gray-100 px-3 py-2 text-sm font-mono">{referralCode || "..."}</code>
                    {referralCode && (
                      <button onClick={() => navigator.clipboard.writeText(referralCode)} className="text-gray-500 hover:text-gray-700">
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Запрошені ({referrals.filter((r) => r.referredId).length})</h4>
                  {referrals.filter((r) => r.referredId).length === 0 ? (
                    <p className="mt-1 text-sm text-gray-500">Ще ніхто не приєднався за вашим кодом</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {referrals.filter((r) => r.referredId).map((r) => (
                        <li key={r.id} className="text-sm text-gray-600">
                          Користувач приєднався {new Date(r.createdAt).toLocaleDateString("uk")}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "data" && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Експорт даних</CardTitle></CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-gray-600">
                    Завантажте всі ваші дані у форматі JSON.
                  </p>
                  <Button variant="outline" onClick={handleExport}>Експортувати дані</Button>
                </CardContent>
              </Card>
              <Card className="border-red-200">
                <CardHeader><CardTitle className="text-red-700">Видалення акаунту</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
                    <div>
                      <p className="text-sm text-gray-600">
                        Ця дія незворотна. Усі ваші дані, воркфлоу та credentials будуть видалені.
                      </p>
                      <Button variant="outline" className="mt-4 border-red-300 text-red-700 hover:bg-red-50" onClick={handleDeleteAccount}>
                        Видалити акаунт
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
