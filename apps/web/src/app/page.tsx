import Link from "next/link";
import { Zap, Key, BarChart3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Zap,
    title: "2000+ готових воркфлоу",
    description:
      "Обирайте з каталогу готових автоматизацій для будь-якого завдання — від CRM до маркетингу.",
  },
  {
    icon: Key,
    title: "Безпечне зберігання ключів",
    description:
      "Ваші API-ключі зашифровані AES-256 та зберігаються у захищеному сховищі.",
  },
  {
    icon: BarChart3,
    title: "Моніторинг у реальному часі",
    description:
      "Слідкуйте за виконанням, переглядайте логи та отримуйте сповіщення про помилки.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "назавжди",
    features: [
      "100 виконань / місяць",
      "5 активних воркфлоу",
      "Базові шаблони",
      "Email підтримка",
    ],
    cta: "Почати безкоштовно",
    highlighted: false,
  },
  {
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
    cta: "Обрати Pro",
    highlighted: true,
  },
  {
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
    cta: "Обрати Business",
    highlighted: false,
  },
];

export default function HomePage() {
  return (
    <div className="-mx-4 -mt-8 sm:-mx-6 lg:-mx-8">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-900 px-4 py-20 text-center text-white sm:px-6 sm:py-28 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          AutoAct — Автоматизуйте все
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-100 sm:text-xl">
          Оберіть воркфлоу з каталогу, додайте свої ключі, і система працює за
          вас
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/catalog">
            <Button
              size="lg"
              className="bg-white text-primary-700 hover:bg-primary-50"
            >
              Переглянути каталог
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              Почати безкоштовно
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-gray-900">
          Чому AutoAct?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
          Все, що потрібно для автоматизації бізнес-процесів, в одному місці.
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="text-center">
              <CardHeader>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                  <f.icon className="h-6 w-6" />
                </div>
                <CardTitle className="mt-4">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Тарифні плани
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            Оберіть план, що підходить вашому бізнесу.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted
                    ? "border-2 border-primary-500 shadow-lg"
                    : ""
                }
              >
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
                  <div className="mt-6">
                    <Link href="/auth/register">
                      <Button
                        className="w-full"
                        variant={plan.highlighted ? "default" : "outline"}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
