"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary-600" />
        <h1 className="text-3xl font-extrabold text-gray-900">
          Умови використання
        </h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Останнє оновлення: 1 січня 2026
      </p>

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Загальні положення</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              Ці Умови використання (&quot;Умови&quot;) регулюють використання платформи
              AutoAct (&quot;Сервіс&quot;), що надається компанією AutoAct
              (&quot;Компанія&quot;, &quot;ми&quot;, &quot;нас&quot;).
            </p>
            <p>
              Реєструючись або використовуючи Сервіс, ви погоджуєтесь з цими
              Умовами. Якщо ви не погоджуєтесь з будь-яким пунктом, будь ласка,
              не використовуйте Сервіс.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Умови використання сервісу</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>Використовуючи Сервіс, ви зобов&apos;язуєтесь:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Надавати точну та актуальну інформацію при реєстрації облікового
                запису.
              </li>
              <li>
                Зберігати конфіденційність своїх облікових даних та негайно
                повідомляти про несанкціонований доступ.
              </li>
              <li>
                Не використовувати Сервіс для незаконних цілей або дій, що
                порушують права третіх осіб.
              </li>
              <li>
                Не намагатись отримати несанкціонований доступ до систем або
                даних інших користувачів.
              </li>
              <li>
                Дотримуватись обмежень тарифного плану щодо кількості виконань та
                активних воркфлоу.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Обмеження</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>Забороняється:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Копіювати, модифікувати або розповсюджувати програмне
                забезпечення Сервісу без письмового дозволу.
              </li>
              <li>
                Використовувати автоматизовані засоби для збору даних з Сервісу
                (scraping).
              </li>
              <li>
                Передавати або перепродавати доступ до Сервісу третім особам.
              </li>
              <li>
                Створювати воркфлоу, що генерують надмірне навантаження на
                інфраструктуру.
              </li>
              <li>
                Використовувати Сервіс для розсилки спаму або шкідливого
                контенту.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Обмеження відповідальності</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              Сервіс надається &quot;як є&quot; без будь-яких гарантій, явних чи
              неявних. Ми не гарантуємо безперервну або безпомилкову роботу
              Сервісу.
            </p>
            <p>
              Компанія не несе відповідальності за будь-які прямі, непрямі,
              випадкові або побічні збитки, що виникають внаслідок використання
              або неможливості використання Сервісу.
            </p>
            <p>
              Максимальна відповідальність Компанії обмежується сумою, сплаченою
              користувачем за останні 12 місяців використання Сервісу.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Припинення доступу</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              Ми залишаємо за собою право призупинити або припинити ваш доступ до
              Сервісу у разі порушення цих Умов, без попереднього повідомлення.
            </p>
            <p>
              Ви можете припинити використання Сервісу та видалити свій обліковий
              запис у будь-який час через налаштування акаунту.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Контактна інформація</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              Якщо у вас є запитання щодо цих Умов, зв&apos;яжіться з нами:
            </p>
            <ul className="list-none space-y-1">
              <li>
                <strong>Email:</strong> support@autoact.io
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
