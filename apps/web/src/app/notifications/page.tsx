"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}

const typeIcon: Record<string, React.ElementType> = {
  execution_success: CheckCircle,
  execution_failed: XCircle,
  workflow_paused: AlertTriangle,
  workflow_needs_attention: AlertTriangle,
  plan_upgraded: Info,
  plan_downgraded: Info,
  referral_reward: CheckCircle,
  system: Info,
};

const typeColor: Record<string, string> = {
  execution_success: "text-green-500",
  execution_failed: "text-red-500",
  workflow_paused: "text-amber-500",
  workflow_needs_attention: "text-amber-500",
  plan_upgraded: "text-blue-500",
  plan_downgraded: "text-blue-500",
  referral_reward: "text-green-500",
  system: "text-gray-500",
};

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getNotifications({
        page,
        unreadOnly: filter === "unread",
      });
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
      setTotalPages(res.totalPages);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, [user, page, filter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function handleMarkRead(id: string) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // handle
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // handle
    }
  }

  if (authLoading || !user) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Сповіщення</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} нових</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4" />
            Прочитати всі
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="mt-4 flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setFilter("all");
            setPage(1);
          }}
        >
          Всі
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setFilter("unread");
            setPage(1);
          }}
        >
          Непрочитані
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <p className="mt-8 text-gray-500">Завантаження...</p>
      ) : notifications.length === 0 ? (
        <div className="mt-12 rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Bell className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">
            {filter === "unread"
              ? "Немає непрочитаних сповіщень"
              : "Ще немає сповіщень"}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {notifications.map((n) => {
            const Icon = typeIcon[n.type] || Info;
            const color = typeColor[n.type] || "text-gray-500";
            const isUnread = !n.readAt;

            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 rounded-xl border p-4 transition ${
                  isUnread
                    ? "border-primary-200 bg-primary-50/50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className={`mt-0.5 flex-shrink-0 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-medium ${
                        isUnread ? "text-gray-900" : "text-gray-700"
                      }`}
                    >
                      {n.title}
                    </p>
                    <span className="flex-shrink-0 text-xs text-gray-400">
                      {new Date(n.createdAt).toLocaleString("uk-UA")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600">{n.body}</p>
                </div>
                {isUnread && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-primary-600 hover:bg-primary-100"
                    title="Позначити прочитаним"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
