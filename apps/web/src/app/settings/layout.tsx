"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Shield,
  Bell,
  Key,
  Gift,
  Database,
} from "lucide-react";

const tabs = [
  { href: "/settings/profile", label: "Профіль", icon: User },
  { href: "/settings/security", label: "Безпека", icon: Shield },
  { href: "/settings/notifications", label: "Сповіщення", icon: Bell },
  { href: "/settings/api-keys", label: "API ключі", icon: Key },
  { href: "/settings/referral", label: "Реферали", icon: Gift },
  { href: "/settings/data", label: "Дані", icon: Database },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Налаштування</h1>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Sidebar nav */}
        <div className="w-full lg:w-56">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
