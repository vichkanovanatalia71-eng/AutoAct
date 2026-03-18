"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-extrabold text-gray-900">
          Політика конфіденційності
        </h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Останнє оновлення: 1 січня 2026
      </p>

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Збір даних</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>Ми збираємо наступні типи даних:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Особисті дані:</strong> email-адреса, ім&apos;я при
                реєстрації облікового запису.
              </li>
              <li>
                <strong>Дані використання:</strong> інформація про воркфлоу,
                виконання, журнали активності.
              </li>
              <li>
                <strong>Технічні дані:</strong> IP-адреса, тип браузера,
                операційна система, дані cookies.
              </li>
              <li>
                <strong>Платіжні дані:</strong> обробляються через захищений
                платіжний шлюз Stripe. Ми не зберігаємо дані кредитних карток.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Використання даних</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>Ваші дані використовуються для:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Надання та підтримки функціональності Сервісу.</li>
              <li>Автентифікації та забезпечення безпеки облікового запису.</li>
              <li>Надсилання важливих сповіщень про роботу Сервісу.</li>
              <li>Покращення якості та продуктивності Сервісу.</li>
              <li>
                Виконання юридичних зобов&apos;язань та запобігання
                зловживанням.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Зберігання даних</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              Ваші дані зберігаються на захищених серверах з використанням
              шифрування. Ми застосовуємо стандартні галузеві практики для
              захисту ваших даних.
            </p>
            <p>
              Облікові дані (credentials) для інтеграцій зберігаються в
              зашифрованому вигляді (AES-256) і ніколи не передаються третім
              особам.
            </p>
            <p>
              Дані зберігаються протягом періоду активності облікового запису та
              протягом 30 днів після його видалення.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Права користувачів</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>Відповідно до GDPR та чинного законодавства, ви маєте право:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Доступ:</strong> запитати копію всіх ваших персональних
                даних.
              </li>
              <li>
                <strong>Виправлення:</strong> оновити або виправити неточні дані.
              </li>
              <li>
                <strong>Видалення:</strong> видалити свій обліковий запис та всі
                пов&apos;язані дані.
              </li>
              <li>
                <strong>Перенесення:</strong> отримати ваші дані в
                машиночитаному форматі.
              </li>
              <li>
                <strong>Обмеження:</strong> обмежити обробку ваших персональних
                даних.
              </li>
              <li>
                <strong>Заперечення:</strong> заперечити проти обробки даних для
                маркетингових цілей.
              </li>
            </ul>
            <p className="mt-3">
              Для реалізації цих прав зверніться до нас за адресою{" "}
              <strong>privacy@autoact.io</strong>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Файли cookie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              Ми використовуємо необхідні файли cookie для забезпечення
              функціональності Сервісу (автентифікація, налаштування сесій).
              Аналітичні cookie використовуються лише за вашою згодою.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Контакти</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              З питань конфіденційності зв&apos;яжіться з нами:
            </p>
            <ul className="list-none space-y-1">
              <li>
                <strong>Email:</strong> privacy@autoact.io
              </li>
              <li>
                <strong>Адреса:</strong> Україна, м. Київ
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
