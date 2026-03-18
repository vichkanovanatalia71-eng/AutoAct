"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getAdminSettings } from "@/lib/admin-api";
import {
  LayoutDashboard,
  FileJson,
  RefreshCw,
  Settings,
  ShieldCheck,
  Box,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Панель управління", icon: LayoutDashboard },
  { href: "/admin/workflows", label: "Шаблони воркфлоу", icon: FileJson },
  { href: "/admin/node-library", label: "Бібліотека вузлів", icon: Box },
  { href: "/admin/sync-logs", label: "Журнал синхронізацій", icon: RefreshCw },
  { href: "/admin/settings", label: "Налаштування", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Verify admin access by calling admin settings endpoint
    getAdminSettings()
      .then(() => {
        setAuthorized(true);
        setChecking(false);
      })
      .catch(() => {
        router.push("/dashboard");
      });
  }, [user, authLoading, router]);

  if (authLoading || checking || !authorized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">Перевірка доступу...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] gap-0">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
          <ShieldCheck className="h-5 w-5 text-primary-600" />
          <span className="text-lg font-bold text-gray-900">
            Адмін-панель AutoAct
          </span>
        </div>

        <nav className="mt-2 flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6 lg:p-8">{children}</div>
    </div>
  );
}
