"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getUsage, changePlan, getBillingPortal } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ExternalLink,
  CreditCard,
  Clock,
  Loader2,
  XCircle,
  History,
} from "lucide-react";

interface UsageData {
  plan: string;
  status: string;
  executionsUsed: number;
  executionsLimit: number;
  workflowsUsed: number;
  workflowsLimit: number;
  systemKeyCostCents: number;
  periodEnd?: string;
  billingPortalUrl?: string;
}

const planDetails: Record<string, { price: string; period: string }> = {
  free: { price: "$0", period: "назавжди" },
  pro: { price: "$29", period: "/ місяць" },
  business: { price: "$99", period: "/ місяць" },
};

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "назавжди",
    features: [
      "100 виконань / місяць",
      "5 активних воркфлоу",
      "Базові шаблони",
      "Email підтримка",
    ],
    quotas: {
      parallelExecutions: 1,
      maxExecutionTime: "30с",
      apiRateLimit: "10 запитів/хв",
    },
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/ місяць",
    features: [
      "5 000 виконань / місяць",
      "50 активних воркфлоу",
      "Усі шаблони",
      "Пріоритетна підтримка",
      "Webhook тригери",
    ],
    highlighted: true,
    quotas: {
      parallelExecutions: 5,
      maxExecutionTime: "120с",
      apiRateLimit: "60 запитів/хв",
    },
  },
  {
    id: "business",
    name: "Business",
    price: "$99",
    period: "/ місяць",
    features: [
      "50 000 виконань / місяць",
      "Необмежені воркфлоу",
      "Усі шаблони",
      "Виділена підтримка",
      "SLA 99.9%",
      "SSO інтеграція",
    ],
    quotas: {
      parallelExecutions: 20,
      maxExecutionTime: "300с",
      apiRateLimit: "300 запитів/хв",
    },
  },
];

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getUsage()
      .then(setUsage)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleChangePlan(planId: string) {
    setChangingPlan(planId);
    try {
      const res = await changePlan(planId);
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        const updated = await getUsage();
        setUsage(updated);
      }
    } catch {
      // handle error
    } finally {
      setChangingPlan(null);
    }
  }

  async function handleManagePayment() {
    setPortalLoading(true);
    try {
      const res = await getBillingPortal();
      if (res.url) {
        window.location.href = res.url;
      }
    } catch {
      // handle error
    } finally {
      setPortalLoading(false);
    }
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

  if (error) {
    return (
      <div className="py-20 text-center">
        <XCircle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-4 text-red-600">{error}</p>
      </div>
    );
  }

  const currentPlan = usage?.plan?.toLowerCase() ?? user.plan?.toLowerCase() ?? "free";
  const currentPlanInfo = planDetails[currentPlan] || planDetails.free;
  const currentPlanQuotas = plans.find((p) => p.id === currentPlan)?.quotas;

  const execPercent =
    usage && usage.executionsLimit > 0
      ? Math.min(100, Math.round((usage.executionsUsed / usage.executionsLimit) * 100))
      : 0;

  const wfPercent =
    usage && usage.workflowsLimit > 0
      ? Math.min(100, Math.round((usage.workflowsUsed / usage.workflowsLimit) * 100))
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Білінг</h1>
        <Link href="/billing/history">
          <Button variant="outline">
            <History className="h-4 w-4" />
            Історія платежів
          </Button>
        </Link>
      </div>

      {/* Current Plan Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Поточний план
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold text-gray-900 capitalize">{currentPlan}</span>
                <Badge variant="success">Активний</Badge>
              </div>
              <p className="text-lg text-gray-600">
                <span className="font-bold text-gray-900">{currentPlanInfo.price}</span>{" "}
                {currentPlanInfo.period}
              </p>
              {usage?.periodEnd && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  Дата оновлення: {new Date(usage.periodEnd).toLocaleDateString("uk-UA")}
                </div>
              )}
              <p className="text-sm text-gray-500">
                Спосіб оплати: {currentPlan === "free" ? "Не потрібен" : "Картка Stripe"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })}>
                Змінити план
              </Button>
              {currentPlan !== "free" && (
                <Button variant="outline" onClick={handleManagePayment} disabled={portalLoading}>
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Керувати оплатою
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Section */}
      {usage && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Executions meter */}
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-gray-500">Виконання</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {usage.executionsUsed.toLocaleString()} / {usage.executionsLimit.toLocaleString()}
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    execPercent > 80 ? "bg-red-500" : "bg-primary-500"
                  }`}
                  style={{ width: `${execPercent}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-gray-500">{execPercent}% використано</p>
            </CardContent>
          </Card>

          {/* Workflows meter */}
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-gray-500">Воркфлоу</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {usage.workflowsUsed} / {usage.workflowsLimit}
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    wfPercent > 80 ? "bg-red-500" : "bg-primary-500"
                  }`}
                  style={{ width: `${wfPercent}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-gray-500">{wfPercent}% використано</p>
            </CardContent>
          </Card>

          {/* System key cost */}
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-gray-500">Витрати на системні ключі</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                ${(usage.systemKeyCostCents / 100).toFixed(2)}
              </p>
              <p className="mt-3 text-xs text-gray-500">За поточний білінговий період</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quotas table */}
      {currentPlanQuotas && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Квоти поточного плану</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">Параметр</th>
                  <th className="px-6 py-3 font-medium">Значення</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-6 py-4 text-gray-900">Паралельні виконання</td>
                  <td className="px-6 py-4 text-gray-600">{currentPlanQuotas.parallelExecutions}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-gray-900">Макс. час виконання</td>
                  <td className="px-6 py-4 text-gray-600">{currentPlanQuotas.maxExecutionTime}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-gray-900">Ліміт API запитів</td>
                  <td className="px-6 py-4 text-gray-600">{currentPlanQuotas.apiRateLimit}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan comparison */}
      <div id="plans-section" className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Тарифні плани</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.highlighted
                    ? "border-2 border-primary-500 shadow-lg"
                    : ""
                } ${isCurrent ? "ring-2 ring-primary-300" : ""}`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="default">Поточний план</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-gray-500"> {plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
                        <span className="text-gray-700">{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    <p>Паралельні виконання: {plan.quotas.parallelExecutions}</p>
                    <p>Макс. час: {plan.quotas.maxExecutionTime}</p>
                    <p>API ліміт: {plan.quotas.apiRateLimit}</p>
                  </div>
                  <div className="mt-6">
                    {isCurrent ? (
                      <Button className="w-full" variant="outline" disabled>
                        Поточний план
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={plan.highlighted ? "default" : "outline"}
                        onClick={() => handleChangePlan(plan.id)}
                        disabled={changingPlan === plan.id}
                      >
                        {changingPlan === plan.id ? "Завантаження..." : "Обрати"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
