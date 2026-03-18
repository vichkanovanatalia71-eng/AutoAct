"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getUsage, changePlan } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ExternalLink } from "lucide-react";

interface UsageData {
  plan: string;
  executionsUsed: number;
  executionsLimit: number;
  billingPortalUrl?: string;
}

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
  },
];

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getUsage()
      .then(setUsage)
      .catch(() => {})
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

  if (authLoading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  const currentPlan =
    usage?.plan?.toLowerCase() ?? user.plan?.toLowerCase() ?? "free";
  const usagePercent =
    usage && usage.executionsLimit > 0
      ? Math.min(
          100,
          Math.round((usage.executionsUsed / usage.executionsLimit) * 100)
        )
      : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Тарифні плани</h1>

      {/* Usage stats */}
      {loading ? (
        <p className="mt-4 text-gray-500">Завантаження...</p>
      ) : usage ? (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Поточний план</p>
                <p className="text-lg font-semibold capitalize text-gray-900">
                  {currentPlan}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Використання</p>
                <p className="text-lg font-semibold text-gray-900">
                  {usage.executionsUsed.toLocaleString()} /{" "}
                  {usage.executionsLimit.toLocaleString()} виконань
                </p>
              </div>
              {usage.billingPortalUrl && (
                <a
                  href={usage.billingPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4" />
                    Stripe Customer Portal
                  </Button>
                </a>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePercent > 80 ? "bg-red-500" : "bg-primary-500"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-gray-500">
                {usagePercent}% використано
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Plan cards */}
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
                      <span className="text-gray-700">{feat}</span>
                    </li>
                  ))}
                </ul>
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
                      {changingPlan === plan.id
                        ? "Завантаження..."
                        : "Обрати"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
