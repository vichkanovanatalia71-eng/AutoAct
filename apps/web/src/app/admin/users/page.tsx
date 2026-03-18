"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Users, ChevronLeft, ChevronRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface UserEntry {
  id: string;
  email: string;
  plan: string;
  workflowCount: number;
  adminRole: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (search) params.set("search", search);

    fetch(`${API_URL}/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("autoact_token")}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user, page, search]);

  if (loading || !user) return <p className="py-20 text-center text-gray-500">Завантаження...</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Користувачі</h1>
        <span className="text-sm text-gray-500">{total} загалом</span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-gray-400" />
        <Input
          placeholder="Пошук за email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>

      <div className="mt-6 space-y-3">
        {fetching ? (
          <p className="text-center text-gray-500">Завантаження...</p>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <Users className="h-8 w-8 text-gray-300" />
            <p className="text-gray-500">Користувачів не знайдено</p>
          </div>
        ) : (
          users.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{u.email}</p>
                  <p className="text-sm text-gray-500">
                    {u.workflowCount} воркфлоу | Створений {new Date(u.createdAt).toLocaleDateString("uk")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={u.plan === "free" ? "secondary" : "default"}>
                    {u.plan}
                  </Badge>
                  {u.adminRole && <Badge variant="outline">{u.adminRole}</Badge>}
                  {u.emailVerified && <Badge variant="outline">verified</Badge>}
                  {u.twoFactorEnabled && <Badge variant="outline">2FA</Badge>}
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
