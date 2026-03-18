"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getReferralInfo } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Gift,
  Copy,
  Check,
  Users,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";

interface Referral {
  id: string;
  referredId?: string;
  rewardGranted: boolean;
  createdAt: string;
}

export default function ReferralSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getReferralInfo()
      .then((r) => {
        setReferralCode(r.code);
        setReferrals(r.referrals);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  function handleCopyCode() {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyLink() {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/register?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  if (authLoading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
        <p className="mt-4 text-gray-500">Завантаження...</p>
      </div>
    );
  }

  const confirmedReferrals = referrals.filter((r) => r.referredId);
  const pendingReferrals = referrals.filter((r) => !r.referredId);
  const rewardsGranted = referrals.filter((r) => r.rewardGranted).length;

  return (
    <div className="space-y-6">
      {/* Referral code & link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Реферальна програма
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Запрошуйте друзів та отримуйте бонуси. Кожен підтверджений реферал дає вам додаткові виконання.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700">Ваш реферальний код</label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono">
                {referralCode || "—"}
              </code>
              {referralCode && (
                <Button variant="outline" size="sm" onClick={handleCopyCode}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Реферальне посилання</label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-800">
                {typeof window !== "undefined" ? window.location.origin : ""}/auth/register?ref={referralCode}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {copiedLink ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="mx-auto h-8 w-8 text-primary-600" />
            <p className="mt-2 text-2xl font-bold text-gray-900">{confirmedReferrals.length}</p>
            <p className="text-sm text-gray-500">Підтверджені</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Gift className="mx-auto h-8 w-8 text-green-600" />
            <p className="mt-2 text-2xl font-bold text-gray-900">{rewardsGranted}</p>
            <p className="text-sm text-gray-500">Нагороди отримано</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="mx-auto h-8 w-8 text-amber-600" />
            <p className="mt-2 text-2xl font-bold text-gray-900">{pendingReferrals.length}</p>
            <p className="text-sm text-gray-500">Очікують</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral list */}
      <Card>
        <CardHeader>
          <CardTitle>Запрошені користувачі</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-sm text-gray-500">Ще ніхто не приєднався за вашим кодом</p>
          ) : (
            <div className="space-y-2">
              {referrals.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <p className="text-sm text-gray-900">
                      {r.referredId ? "Користувач приєднався" : "Очікує реєстрації"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString("uk-UA")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.referredId ? "success" : "warning"}>
                      {r.referredId ? "Підтверджено" : "Очікує"}
                    </Badge>
                    {r.rewardGranted && (
                      <Badge variant="default">Нагороджено</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
