"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Building2, Sparkles } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "назавжди",
    description: "Для початку роботи з автоматизацією",
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
    description: "Для професіоналів та малого бізнесу",
    icon: Sparkles,
    highlighted: true,
    features: [
      "5 000 виконань / місяць",
      "50 активних воркфлоу",
      "Усі шаблони",
      "Пріоритетна підтримка",
      "Webhook тригери",
      "API доступ",
      "Власні інтеграції",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "$99",
    period: "/ місяць",
    description: "Для команд та великих проєктів",
    icon: Building2,
    features: [
      "50 000 виконань / місяць",
      "Необмежені воркфлоу",
      "Усі шаблони",
      "Виділена підтримка",
      "SLA 99.9%",
      "SSO інтеграція",
      "Аудит логи",
      "Командний доступ",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="text-4xl font-extrabold text-gray-900">
          Тарифні плани
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Оберіть план, який найкраще підходить для ваших потреб автоматизації
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
                <Badge variant="default">Популярний</Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center gap-2">
                <plan.icon className="h-5 w-5 text-primary-600" />
                <CardTitle>{plan.name}</CardTitle>
              </div>
              <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
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
              <div className="mt-6">
                <Link href="/auth/register">
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    Розпочати
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-3xl text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Часті запитання
        </h2>
        <div className="mt-6 grid gap-6 text-left sm:grid-cols-2">
          <div>
            <h3 className="font-medium text-gray-900">
              Чи можу я змінити план пізніше?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Так, ви можете оновити або змінити план у будь-який момент в
              налаштуваннях біллінгу.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              Що буде, якщо я перевищу ліміт?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Ми повідомимо вас, коли ви наблизитесь до ліміту. Виконання
              зупиняться при досягненні межі до наступного періоду.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              Чи є пробний період?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Free план є безкоштовним назавжди. Платні плани мають 14-денний
              пробний період.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              Як скасувати підписку?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Ви можете скасувати підписку в будь-який момент. Доступ
              залишиться до кінця оплаченого періоду.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
