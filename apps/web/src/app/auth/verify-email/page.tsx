"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Токен верифікації відсутній");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`${API_URL}/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Помилка верифікації");
        }

        setStatus("success");
      } catch (err: unknown) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Помилка верифікації email"
        );
      }
    }

    verify();
  }, [token]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Верифікація email...
              </h2>
              <p className="text-sm text-gray-600">
                Зачекайте, ми підтверджуємо вашу адресу електронної пошти.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Email підтверджено
              </h2>
              <p className="text-sm text-gray-600">
                Вашу адресу електронної пошти успішно підтверджено. Тепер ви
                можете повноцінно користуватися сервісом.
              </p>
              <Link href="/dashboard">
                <Button>Перейти до панелі</Button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Помилка верифікації
              </h2>
              <p className="text-sm text-gray-600">{errorMessage}</p>
              <div className="flex gap-3">
                <Link href="/auth/login">
                  <Button variant="outline">Увійти</Button>
                </Link>
                <Link href="/auth/register">
                  <Button>Зареєструватися</Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
