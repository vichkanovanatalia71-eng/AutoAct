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
  Eye,
  Calendar,
  User,
  Tag,
  Layers,
} from "lucide-react";
import { getTemplate, getCredentials } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PdfViewer } from "@/components/PdfViewer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { WorkflowDiagram } from "@/components/WorkflowDiagram";
import { ActivationWizard } from "@/components/ActivationWizard";

interface TemplateNode {
  id: string;
  type: string;
  label?: string;
  config?: Record<string, unknown>;
  next?: string[];
  next_true?: string[];
  next_false?: string[];
}

interface PdfAttachment {
  id: string;
  title: string;
  url: string;
}

interface VideoAttachment {
  id: string;
  title: string;
  url: string;
  source: "youtube" | "vimeo" | "upload";
}

interface CardLayoutSection {
  type: string;
  visible: boolean;
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
  coverUrl?: string;
  author?: string;
  views?: number;
  createdAt?: string;
  pdfs?: PdfAttachment[];
  videos?: VideoAttachment[];
  cardLayout?: CardLayoutSection[];
}

interface Credential {
  id: string;
  name: string;
  service: string;
  serviceType?: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [template, setTemplate] = useState<Template | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  const id = params.id as string;

  // Track view
  useEffect(() => {
    fetch(`${API_URL}/templates/${id}/view`, { method: "POST" }).catch(
      () => {}
    );
  }, [id]);

  useEffect(() => {
    async function load() {
      try {
        const [t, c] = await Promise.allSettled([
          getTemplate(id),
          user ? getCredentials() : Promise.resolve([]),
        ]);
        if (t.status === "fulfilled") {
          const tmpl = t.value as Record<string, unknown>;
          // Normalize: support both definition.nodes and top-level nodes
          const nodes =
            (tmpl.nodes as TemplateNode[]) ||
            (tmpl.definition as { nodes?: TemplateNode[] })?.nodes ||
            [];
          setTemplate({ ...(tmpl as unknown as Template), nodes });
        }
        if (c.status === "fulfilled")
          setCredentials(
            (c.value as Array<Record<string, string>>).map((cr) => ({
              id: cr.id,
              name: cr.name,
              service: cr.serviceType || cr.service,
            })) as Credential[]
          );
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

  function isSectionVisible(sectionType: string): boolean {
    if (!template?.cardLayout || template.cardLayout.length === 0) return true;
    const section = template.cardLayout.find((s) => s.type === sectionType);
    return section ? section.visible : true;
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="mt-4 text-gray-500">Завантаження...</p>
      </div>
    );
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
        (
          c.service ||
          (c as unknown as { serviceType?: string }).serviceType ||
          ""
        )
          .toLowerCase() === service.toLowerCase()
    );

  const formattedDate = template.createdAt
    ? new Date(template.createdAt).toLocaleDateString("uk-UA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div>
      <Link
        href="/catalog"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад до каталогу
      </Link>

      {/* 1. Cover Image */}
      {isSectionVisible("cover") && template.coverUrl && (
        <div className="mb-8 overflow-hidden rounded-xl">
          <img
            src={template.coverUrl}
            alt={template.name}
            className="w-full h-[300px] object-cover"
          />
        </div>
      )}

      {/* 2. Header */}
      {isSectionVisible("header") && (
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {template.name}
            </h1>
            <Badge>{template.category}</Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {template.author && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {template.author}
              </span>
            )}
            {typeof template.views === "number" && (
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {template.views} переглядів
              </span>
            )}
            <span className="flex items-center gap-1">
              <TriggerIcon className="h-4 w-4" />
              {triggerLabels[template.triggerType] || template.triggerType}
            </span>
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formattedDate}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Description */}
      {isSectionVisible("description") && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Опис</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {template.description}
          </p>
        </div>
      )}

      {/* 4. Nodes & Credentials — two columns */}
      {isSectionVisible("nodes_credentials") && (
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {/* Nodes list */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Кроки воркфлоу ({template.nodes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {template.nodes.length === 0 ? (
                <p className="text-sm text-gray-500">Немає кроків</p>
              ) : (
                template.nodes.map((node, idx) => (
                  <div
                    key={node.id || idx}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {node.label || node.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-gray-500">{node.type}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Required Credentials */}
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. Workflow Diagram */}
      {isSectionVisible("diagram") && template.nodes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Діаграма воркфлоу
          </h2>
          <WorkflowDiagram nodes={template.nodes} />
        </div>
      )}

      {/* 6. PDF Attachments */}
      {isSectionVisible("pdfs") &&
        template.pdfs &&
        template.pdfs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              PDF документи
            </h2>
            <div className="space-y-4">
              {template.pdfs.map((pdf) => (
                <PdfViewer key={pdf.id} url={pdf.url} title={pdf.title} />
              ))}
            </div>
          </div>
        )}

      {/* 7. Video Attachments */}
      {isSectionVisible("videos") &&
        template.videos &&
        template.videos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Відео
            </h2>
            <div className="space-y-4">
              {template.videos.map((video) => (
                <VideoPlayer
                  key={video.id}
                  url={video.url}
                  title={video.title}
                  source={video.source}
                />
              ))}
            </div>
          </div>
        )}

      {/* 8. Activate Button */}
      <div className="mb-12">
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => {
            if (!user) {
              router.push("/auth/login");
              return;
            }
            setWizardOpen(true);
          }}
        >
          <Play className="h-4 w-4" />
          Активувати воркфлоу
        </Button>
      </div>

      {/* Activation Wizard */}
      <ActivationWizard
        templateId={template.id}
        templateName={template.name}
        triggerType={template.triggerType}
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </div>
  );
}
