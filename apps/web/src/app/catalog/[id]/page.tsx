"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Zap,
  Clock,
  Globe,
  Key,
  Play,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getTemplate, getCredentials, createWorkflow } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface TemplateNode {
  id: string;
  type: string;
  label: string;
  config?: Record<string, unknown>;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  triggerType: string;
  requiredCredentials: string[];
  nodes: TemplateNode[];
}

interface Credential {
  id: string;
  name: string;
  service: string;
}

const triggerLabels: Record<string, string> = {
  webhook: "Webhook",
  cron: "За розкладом",
  manual: "Ручний запуск",
};

const triggerIcons: Record<string, typeof Zap> = {
  webhook: Zap,
  cron: Clock,
  manual: Globe,
};

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [template, setTemplate] = useState<Template | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState("");
  const [credentialMapping, setCredentialMapping] = useState<
    Record<string, string>
  >({});
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");

  const id = params.id as string;

  useEffect(() => {
    async function load() {
      try {
        const [t, c] = await Promise.allSettled([
          getTemplate(id),
          user ? getCredentials() : Promise.resolve([]),
        ]);
        if (t.status === "fulfilled") {
          const tmpl = t.value;
          // Normalize: support both definition.nodes and top-level nodes
          const nodes =
            tmpl.nodes ||
            (tmpl as unknown as { definition?: { nodes?: TemplateNode[] } })
              .definition?.nodes ||
            [];
          setTemplate({ ...tmpl, nodes });
          setWorkflowName(tmpl.name);
        }
        if (c.status === "fulfilled")
          setCredentials(c.value as Credential[]);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

  async function handleActivate() {
    if (!template) return;
    setError("");
    setActivating(true);
    try {
      const res = await createWorkflow({
        templateId: template.id,
        name: workflowName,
        credentialMapping,
      });
      router.push(`/workflows/${res.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Помилка активації");
    } finally {
      setActivating(false);
    }
  }

  if (loading) {
    return <p className="py-20 text-center text-gray-500">Завантаження...</p>;
  }

  if (!template) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Шаблон не знайдено</p>
        <Link
          href="/catalog"
          className="mt-4 inline-block text-primary-600 hover:underline"
        >
          Повернутися до каталогу
        </Link>
      </div>
    );
  }

  const TriggerIcon = triggerIcons[template.triggerType] || Zap;

  const credentialsByService = (service: string) =>
    credentials.filter(
      (c) =>
        (c.service || (c as unknown as { serviceType?: string }).serviceType || "")
          .toLowerCase() === service.toLowerCase()
    );

  return (
    <div>
      <Link
        href="/catalog"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до каталогу
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {template.name}
            </h1>
            <Badge>{template.category}</Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          <p className="mt-6 text-gray-700">{template.description}</p>

          {/* Trigger info */}
          <div className="mt-6 flex items-center gap-2 text-sm text-gray-600">
            <TriggerIcon className="h-4 w-4" />
            <span>
              Тригер:{" "}
              {triggerLabels[template.triggerType] || template.triggerType}
            </span>
          </div>

          {/* Nodes / steps */}
          <div className="mt-8">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Zap className="h-5 w-5" />
              Кроки воркфлоу ({template.nodes.length})
            </h2>
            <div className="mt-4 space-y-3">
              {template.nodes.map((node, idx) => (
                <div
                  key={node.id || idx}
                  className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {node.label || node.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-sm text-gray-500">{node.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Необхідні облікові дані
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {template.requiredCredentials.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Цей воркфлоу не потребує облікових даних.
                </p>
              ) : (
                template.requiredCredentials.map((service) => {
                  const available = credentialsByService(service);
                  const connected = available.length > 0;
                  return (
                    <div
                      key={service}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                    >
                      <span className="text-sm font-medium capitalize text-gray-900">
                        {service}
                      </span>
                      {connected ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Підключено
                        </span>
                      ) : (
                        <Link
                          href="/credentials"
                          className="flex items-center gap-1 text-xs text-amber-600 hover:underline"
                        >
                          <AlertCircle className="h-4 w-4" />
                          Додати
                        </Link>
                      )}
                    </div>
                  );
                })
              )}
              <div className="pt-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!user) {
                      router.push("/auth/login");
                      return;
                    }
                    setDialogOpen(true);
                  }}
                >
                  <Play className="h-4 w-4" />
                  Активувати воркфлоу
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activation dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Активувати воркфлоу</DialogTitle>
        <DialogDescription>
          Налаштуйте назву та прив&apos;яжіть облікові дані для запуску.
        </DialogDescription>

        <div className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Input
            label="Назва воркфлоу"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
          />

          {template.requiredCredentials.map((service) => {
            const available = credentialsByService(service);
            return (
              <div key={service}>
                <label className="mb-1.5 block text-sm font-medium capitalize text-gray-700">
                  {service}
                </label>
                {available.length > 0 ? (
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    value={credentialMapping[service] || ""}
                    onChange={(e) =>
                      setCredentialMapping((prev) => ({
                        ...prev,
                        [service]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Оберіть облікові дані...</option>
                    {available.map((cred) => (
                      <option key={cred.id} value={cred.id}>
                        {cred.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-amber-600">
                    Немає збережених даних для {service}.{" "}
                    <Link
                      href="/credentials"
                      className="text-primary-600 underline"
                    >
                      Додати
                    </Link>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Скасувати
          </Button>
          <Button onClick={handleActivate} disabled={activating}>
            {activating ? "Завантаження..." : "Активувати"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
