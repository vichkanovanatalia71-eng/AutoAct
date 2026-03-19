"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getUsage, changePlan, getBillingPortal, getBillingHistory } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ExternalLink,
  CreditCard,
  Clock,
  Loader2,
  XCircle,
  History,
  Zap,
  Layers,
  DollarSign,
  ArrowRight,
  Shield,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Download,
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

interface RecentPayment {
  id: string;
  date: string;
  amount: number;
  status: string;
  description: string;
  invoiceUrl?: string;
}

const planConfig: Record<
  string,
  { price: string; period: string; color: string; bg: string; icon: typeof Zap }
> = {
  free: {
    price: "$0",
    period: "назавжди",
    color: "text-gray-600",
    bg: "bg-gray-100",
    icon: Layers,
  },
  pro: {
    price: "$29",
    period: "/ місяць",
    color: "text-primary-600",
    bg: "bg-primary-100",
    icon: Zap,
  },
  business: {
    price: "$99",
    period: "/ місяць",
    color: "text-purple-600",
    bg: "bg-purple-100",
    icon: Shield,
  },
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
    highlighted: true,
    features: [
      "5 000 виконань / місяць",
      "50 активних воркфлоу",
      "Усі шаблони",
      "Пріоритетна підтримка",
      "Webhook тригери",
    ],
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

const statusBadge: Record<
  string,
  { label: string; variant: "success" | "destructive" | "warning" }
> = {
  paid: { label: "Оплачено", variant: "success" },
  failed: { label: "Помилка", variant: "destructive" },
  pending: { label: "Очікує", variant: "warning" },
  refunded: { label: "Повернено", variant: "warning" },
};

function UsageMeter({
  label,
  icon: Icon,
  used,
  limit,
  unit,
}: {
  label: string;
  icon: typeof Zap;
  used: number;
  limit: number;
  unit?: string;
}) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isHigh = percent > 80;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">{label}</span>
        </div>
        <span className="text-xs text-gray-500">{percent}%</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">
          {used.toLocaleString()}
        </span>
        <span className="text-sm text-gray-400">
          / {limit.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isHigh ? "bg-red-500" : "bg-primary-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {isHigh && (
        <p className="text-xs text-red-500">
          Наближається до ліміту — розгляньте оновлення плану
        </p>
      )}
    </div>
  );
}

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
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

    Promise.all([
      getUsage(),
      getBillingHistory(1).catch(() => ({ data: [], total: 0, page: 1, totalPages: 1 })),
    ])
      .then(([usageData, historyData]) => {
        setUsage(usageData);
        setRecentPayments(historyData.data.slice(0, 3));
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Помилка завантаження")
      )
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
    return (
      <p className="py-20 text-center text-gray-500">Завантаження...</p>
    );
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

  const currentPlan =
    usage?.plan?.toLowerCase() ?? user.plan?.toLowerCase() ?? "free";
  const currentConfig = planConfig[currentPlan] || planConfig.free;
  const PlanIcon = currentConfig.icon;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Білінг та оплата</h1>
          <p className="mt-1 text-sm text-gray-500">
            Керуйте підпискою, переглядайте використання та історію платежів
          </p>
        </div>
        <Link href="/billing/history">
          <Button variant="outline">
            <History className="h-4 w-4" />
            Історія платежів
          </Button>
        </Link>
      </div>

      {/* Current Plan + Usage Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Current Plan — left column (2/5) */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${currentConfig.bg}`}
              >
                <PlanIcon className={`h-6 w-6 ${currentConfig.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold capitalize text-gray-900">
                    {currentPlan}
                  </h2>
                  <Badge variant="success">Активний</Badge>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-gray-900">
                    {currentConfig.price}
                  </span>
                  <span className="text-sm text-gray-500">
                    {currentConfig.period}
                  </span>
                </div>
              </div>
            </div>

            {/* Plan meta info */}
            <div className="mt-5 space-y-2.5 border-t border-gray-100 pt-5">
              {usage?.periodEnd && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Наступне оновлення</span>
                  <span className="font-medium text-gray-900">
                    {new Date(usage.periodEnd).toLocaleDateString("uk-UA")}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Спосіб оплати</span>
                <span className="font-medium text-gray-900">
                  {currentPlan === "free" ? "Не потрібен" : "Картка Stripe"}
                </span>
              </div>
              {usage && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Витрати на ключі</span>
                  <span className="font-medium text-gray-900">
                    ${(usage.systemKeyCostCents / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  document
                    .getElementById("plans-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <TrendingUp className="h-4 w-4" />
                Змінити план
              </Button>
              {currentPlan !== "free" && (
                <Button
                  variant="outline"
                  onClick={handleManagePayment}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage meters — right column (3/5) */}
        {usage && (
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Використання ресурсів</CardTitle>
              <CardDescription>Поточний білінговий період</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <UsageMeter
                  label="Виконання"
                  icon={Zap}
                  used={usage.executionsUsed}
                  limit={usage.executionsLimit}
                />
                <UsageMeter
                  label="Воркфлоу"
                  icon={Layers}
                  used={usage.workflowsUsed}
                  limit={usage.workflowsLimit}
                />
              </div>

              {/* Quotas inline */}
              {(() => {
                const quotas = plans.find((p) => p.id === currentPlan)?.quotas;
                if (!quotas) return null;
                return (
                  <div className="mt-6 grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Паралельні</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {quotas.parallelExecutions}
                      </p>
                    </div>
                    <div className="border-x border-gray-200 text-center">
                      <p className="text-xs text-gray-500">Макс. час</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {quotas.maxExecutionTime}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">API ліміт</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {quotas.apiRateLimit}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Останні платежі</CardTitle>
              <Link
                href="/billing/history"
                className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Дивитись усі
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {recentPayments.map((payment) => {
                const config = statusBadge[payment.status] ?? {
                  label: payment.status,
                  variant: "default" as const,
                };
                return (
                  <div
                    key={payment.id}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        payment.status === "paid"
                          ? "bg-green-50"
                          : payment.status === "failed"
                            ? "bg-red-50"
                            : "bg-yellow-50"
                      }`}
                    >
                      {payment.status === "paid" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : payment.status === "failed" ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {payment.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.date).toLocaleDateString("uk-UA", {
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        ${(payment.amount / 100).toFixed(2)}
                      </span>
                      <Badge variant={config.variant} className="text-xs">
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan comparison */}
      <div id="plans-section" className="mt-10">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900">Тарифні плани</h2>
          <p className="mt-1 text-sm text-gray-500">
            Оберіть план, який найкраще підходить для ваших задач
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <Card
                key={plan.id}
                className={`relative transition-shadow hover:shadow-md ${
                  plan.highlighted
                    ? "border-2 border-primary-500 shadow-md"
                    : ""
                } ${isCurrent ? "ring-2 ring-primary-200" : ""}`}
              >
                {plan.highlighted && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary-600 text-white shadow-sm">
                      Популярний
                    </Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="success" className="shadow-sm">
                      Поточний план
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-sm text-gray-500">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5">
                    {plan.features.map((feat) => (
                      <li
                        key={feat}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
                        <span className="text-gray-700">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Quotas */}
                  <div className="mt-4 space-y-1.5 rounded-lg bg-gray-50 px-3 py-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Паралельні</span>
                      <span className="font-medium text-gray-700">
                        {plan.quotas.parallelExecutions}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Макс. час</span>
                      <span className="font-medium text-gray-700">
                        {plan.quotas.maxExecutionTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">API ліміт</span>
                      <span className="font-medium text-gray-700">
                        {plan.quotas.apiRateLimit}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5">
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
                        {changingPlan === plan.id
                          ? "Завантаження..."
                          : "Обрати план"}
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
