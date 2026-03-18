"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface AuditLogEntry {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "30" });
    if (actionFilter) params.set("action", actionFilter);

    fetch(`${API_URL}/admin/audit-logs?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("autoact_token")}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user, page, actionFilter]);

  if (loading || !user) return <p className="py-20 text-center text-gray-500">Завантаження...</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Аудит логи</h1>
        <span className="text-sm text-gray-500">{total} записів</span>
      </div>

      <div className="mt-4">
        <Input
          placeholder="Фільтр за дією (напр. user_login, password_changed)..."
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="max-w-md"
        />
      </div>

      <div className="mt-6 space-y-2">
        {fetching ? (
          <p className="text-center text-gray-500">Завантаження...</p>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <FileText className="h-8 w-8 text-gray-300" />
            <p className="text-gray-500">Немає записів</p>
          </div>
        ) : (
          logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{log.action}</Badge>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{log.resourceType}</span>
                      {log.resourceId && <span className="text-gray-500"> #{log.resourceId.slice(0, 8)}</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {log.userEmail || log.userId || "system"} | {log.ipAddress || "-"} |{" "}
                      {new Date(log.createdAt).toLocaleString("uk")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
