"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Building2, Rocket } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "назавжди",
    icon: Zap,
    features: [
      "100 виконань / місяць",
      "5 активних воркфлоу",
      "Базові шаблони",
      "Email підтримка",
      "Спільнота в Telegram",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/ місяць",
    icon: Rocket,
    highlighted: true,
    features: [
      "5 000 виконань / місяць",
      "50 активних воркфлоу",
      "Усі шаблони",
      "Пріоритетна підтримка",
      "Webhook тригери",
      "API доступ",
      "Розширена аналітика",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "$99",
    period: "/ місяць",
    icon: Building2,
    features: [
      "50 000 виконань / місяць",
      "Необмежені воркфлоу",
      "Усі шаблони",
      "Виділена підтримка",
      "SLA 99.9%",
      "SSO інтеграція",
      "Пріоритетне виконання",
      "Виділений менеджер",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl py-12">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-gray-900">
          Тарифні плани
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Оберіть план, який найкраще підходить для ваших потреб автоматизації
        </p>
      </div>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col ${
              plan.highlighted
                ? "border-2 border-primary-500 shadow-lg"
                : ""
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="default">Найпопулярніший</Badge>
              </div>
            )}
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <plan.icon className="h-6 w-6" />
              </div>
              <CardTitle className="mt-4 text-xl">{plan.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-gray-900">
                  {plan.price}
                </span>
                <span className="text-gray-500"> {plan.period}</span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <ul className="flex-1 space-y-3">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
                    <span className="text-gray-700">{feat}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/auth/register">
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    Розпочати безкоштовно
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-gray-600">
          Маєте питання щодо тарифів?{" "}
          <a
            href="mailto:support@autoact.io"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Зв&apos;яжіться з нами
          </a>
        </p>
      </div>
    </div>
  );
}
