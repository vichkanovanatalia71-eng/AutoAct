"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Key } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface PlatformKey {
  id: string;
  serviceType: string;
  displayName: string;
  pricePerExecution: number;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

async function fetchKeys(): Promise<PlatformKey[]> {
  const res = await fetch(`${API_URL}/admin/platform-keys`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("autoact_token")}` },
  });
  if (!res.ok) throw new Error("Failed to fetch keys");
  return res.json();
}

export default function AdminPlatformKeysPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [keys, setKeys] = useState<PlatformKey[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ serviceType: "", displayName: "", key: "", pricePerExecution: "0.01" });

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchKeys().then(setKeys).catch(() => {});
  }, [user]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/admin/platform-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("autoact_token")}`,
        },
        body: JSON.stringify({
          serviceType: form.serviceType,
          displayName: form.displayName,
          key: form.key,
          pricePerExecution: parseFloat(form.pricePerExecution),
        }),
      });
      if (res.ok) {
        setForm({ serviceType: "", displayName: "", key: "", pricePerExecution: "0.01" });
        setKeys(await fetchKeys());
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Видалити цей ключ?")) return;
    await fetch(`${API_URL}/admin/platform-keys/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("autoact_token")}` },
    });
    setKeys((k) => k.filter((x) => x.id !== id));
  }

  if (loading || !user) return <p className="py-20 text-center text-gray-500">Завантаження...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Платформні API ключі</h1>

      <Card className="mt-6">
        <CardHeader><CardTitle>Додати ключ</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input placeholder="Тип сервісу" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} />
            <Input placeholder="Назва" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            <Input placeholder="API ключ" type="password" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
            <Input placeholder="Ціна/виконання" type="number" step="0.001" value={form.pricePerExecution} onChange={(e) => setForm({ ...form, pricePerExecution: e.target.value })} />
          </div>
          <Button className="mt-3" onClick={handleCreate} disabled={creating}>
            <Plus className="h-4 w-4" /> Додати
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {keys.map((k) => (
          <Card key={k.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">{k.displayName}</p>
                  <p className="text-sm text-gray-500">
                    {k.serviceType} | ${k.pricePerExecution}/exec | {k.usageCount} використань |{" "}
                    {k.isActive ? "Активний" : "Неактивний"}
                  </p>
                </div>
              </div>
              <button onClick={() => handleDelete(k.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ))}
        {keys.length === 0 && <p className="text-center text-gray-500">Немає ключів</p>}
      </div>
    </div>
  );
}
