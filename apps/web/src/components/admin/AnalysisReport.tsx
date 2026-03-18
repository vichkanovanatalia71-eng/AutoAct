"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  analyzeTemplate,
  getTemplateAnalysis,
  applyAnalysis,
  generateNativeNode,
  type AnalysisReport as AnalysisReportType,
} from "@/lib/admin-api";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  Zap,
  Shield,
  Sparkles,
  ArrowRightLeft,
  Brain,
} from "lucide-react";

interface Props {
  templateId: string;
}

export default function AnalysisReport({ templateId }: Props) {
  const [report, setReport] = useState<AnalysisReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Track which items have been applied individually
  const [appliedNodes, setAppliedNodes] = useState<Set<string>>(new Set());
  const [appliedOpts, setAppliedOpts] = useState<Set<string>>(new Set());
  const [skippedNodes, setSkippedNodes] = useState<Set<string>>(new Set());
  const [skippedOpts, setSkippedOpts] = useState<Set<string>>(new Set());

  const fetchAnalysis = useCallback(async () => {
    try {
      const data = await getTemplateAnalysis(templateId);
      setReport(data);
    } catch {
      // No report yet — that's fine
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const data = await analyzeTemplate(templateId);
      setReport(data);
      setAppliedNodes(new Set());
      setAppliedOpts(new Set());
      setSkippedNodes(new Set());
      setSkippedOpts(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка аналізу");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleApplyNode(nodeId: string) {
    setApplying(true);
    setError(null);
    try {
      await applyAnalysis(templateId, {
        nodeReplacements: [nodeId],
        optimizations: [],
      });
      setAppliedNodes((prev) => new Set(prev).add(nodeId));
      setSuccessMessage("Заміну застосовано");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка застосування");
    } finally {
      setApplying(false);
    }
  }

  async function handleApplyOptimization(optId: string) {
    setApplying(true);
    setError(null);
    try {
      await applyAnalysis(templateId, {
        nodeReplacements: [],
        optimizations: [optId],
      });
      setAppliedOpts((prev) => new Set(prev).add(optId));
      setSuccessMessage("Оптимізацію застосовано");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка застосування");
    } finally {
      setApplying(false);
    }
  }

  async function handleApplyAll() {
    if (!report) return;
    setApplying(true);
    setError(null);
    try {
      const nodeIds = report.nodeAnalysis
        .filter((n) => n.hasNativeReplacement && !appliedNodes.has(n.nodeId) && !skippedNodes.has(n.nodeId))
        .map((n) => n.nodeId);
      const optIds = report.optimizationSuggestions
        .filter((o) => !appliedOpts.has(o.id) && !skippedOpts.has(o.id))
        .map((o) => o.id);

      await applyAnalysis(templateId, {
        nodeReplacements: nodeIds,
        optimizations: optIds,
      });

      setAppliedNodes((prev) => {
        const next = new Set(prev);
        nodeIds.forEach((id) => next.add(id));
        return next;
      });
      setAppliedOpts((prev) => {
        const next = new Set(prev);
        optIds.forEach((id) => next.add(id));
        return next;
      });
      setSuccessMessage("Всі пропозиції застосовано");
      fetchAnalysis();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка застосування");
    } finally {
      setApplying(false);
    }
  }

  async function handleGenerate(node: AnalysisReportType["nodesToCreate"][0]) {
    setGenerating(node.suggestedId);
    setError(null);
    try {
      await generateNativeNode({
        suggestedId: node.suggestedId,
        name: node.name,
        replaces: node.replaces,
        implementationApproach: node.implementationApproach,
        packages: node.packages,
        inputSchema: node.inputSchema,
        outputSchema: node.outputSchema,
      });
      setSuccessMessage(`Вузол "${node.name}" згенеровано (статус: needs_review)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка генерації");
    } finally {
      setGenerating(null);
    }
  }

  const priorityVariant: Record<string, "destructive" | "default" | "secondary"> = {
    high: "destructive",
    medium: "default",
    low: "secondary",
  };

  const optimizationIcon: Record<string, React.ReactNode> = {
    parallelization: <Zap className="h-4 w-4 text-yellow-500" />,
    error_handling: <Shield className="h-4 w-4 text-red-500" />,
    caching: <ArrowRightLeft className="h-4 w-4 text-blue-500" />,
    merge_requests: <ArrowRightLeft className="h-4 w-4 text-purple-500" />,
  };

  if (loading) {
    return null;
  }

  const externalNodes = report?.nodeAnalysis?.filter((n) => n.externalService) || [];
  const optimizations = report?.optimizationSuggestions || [];
  const nodesToCreate = report?.nodesToCreate || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Аналіз воркфлоу
          </CardTitle>
          <div className="flex gap-2">
            {report && report.status === "pending" && externalNodes.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleApplyAll}
                disabled={applying}
              >
                {applying && <Loader2 className="h-3 w-3 animate-spin" />}
                Застосувати все
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {report ? "Перезапустити аналіз" : "Запустити аналіз"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}

        {!report && !analyzing && (
          <p className="text-sm text-gray-500">
            Натисніть &quot;Запустити аналіз&quot; для AI-аналізу вузлів воркфлоу
          </p>
        )}

        {analyzing && (
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            AI аналізує вузли воркфлоу...
          </div>
        )}

        {report && (
          <>
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Статус звіту:</span>
              <Badge
                variant={
                  report.status === "applied"
                    ? "success"
                    : report.status === "rejected"
                      ? "destructive"
                      : "secondary"
                }
              >
                {report.status === "pending" && "Очікує"}
                {report.status === "partially_applied" && "Частково застосовано"}
                {report.status === "applied" && "Застосовано"}
                {report.status === "rejected" && "Відхилено"}
              </Badge>
            </div>

            {/* External node replacements */}
            {externalNodes.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">
                  Замінники нативними вузлами ({externalNodes.length})
                </h4>
                <div className="space-y-3">
                  {externalNodes.map((entry) => {
                    const isApplied = appliedNodes.has(entry.nodeId);
                    const isSkipped = skippedNodes.has(entry.nodeId);

                    return (
                      <div
                        key={entry.nodeId}
                        className={`flex items-start justify-between gap-4 rounded-lg border p-3 ${
                          isApplied
                            ? "border-green-200 bg-green-50"
                            : isSkipped
                              ? "border-gray-100 bg-gray-50 opacity-60"
                              : "border-gray-200"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {entry.hasNativeReplacement ? (
                              <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                            )}
                            <span className="font-mono text-sm font-medium">
                              {entry.nodeId}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {entry.nodeType}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {entry.externalService && (
                              <span className="font-medium text-red-600">
                                {entry.externalService}
                              </span>
                            )}
                            {entry.hasNativeReplacement && entry.nativeNodeId && (
                              <span>
                                {" → замінити на "}
                                <span className="font-medium text-green-700">
                                  {entry.nativeNodeId}
                                </span>
                                {" (нативний)"}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">{entry.reason}</p>
                          {entry.confidence > 0 && (
                            <div className="mt-1">
                              <Badge variant="secondary" className="text-xs">
                                Впевненість: {Math.round(entry.confidence * 100)}%
                              </Badge>
                            </div>
                          )}
                        </div>
                        {!isApplied && !isSkipped && entry.hasNativeReplacement && (
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApplyNode(entry.nodeId)}
                              disabled={applying}
                            >
                              Застосувати
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setSkippedNodes((prev) => new Set(prev).add(entry.nodeId))
                              }
                            >
                              Пропустити
                            </Button>
                          </div>
                        )}
                        {isApplied && (
                          <Badge variant="success" className="shrink-0">
                            Застосовано
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Optimization suggestions */}
            {optimizations.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">
                  Оптимізації ({optimizations.length})
                </h4>
                <div className="space-y-3">
                  {optimizations.map((opt) => {
                    const isApplied = appliedOpts.has(opt.id);
                    const isSkipped = skippedOpts.has(opt.id);

                    return (
                      <div
                        key={opt.id}
                        className={`flex items-start justify-between gap-4 rounded-lg border p-3 ${
                          isApplied
                            ? "border-green-200 bg-green-50"
                            : isSkipped
                              ? "border-gray-100 bg-gray-50 opacity-60"
                              : "border-gray-200"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {optimizationIcon[opt.type] || (
                              <Zap className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm font-medium">{opt.description}</span>
                            <Badge variant={priorityVariant[opt.priority] || "secondary"} className="text-xs">
                              {opt.priority}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Вузли: {opt.affectedNodes.join(", ")}
                          </p>
                        </div>
                        {!isApplied && !isSkipped && (
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApplyOptimization(opt.id)}
                              disabled={applying}
                            >
                              Застосувати
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setSkippedOpts((prev) => new Set(prev).add(opt.id))
                              }
                            >
                              Пропустити
                            </Button>
                          </div>
                        )}
                        {isApplied && (
                          <Badge variant="success" className="shrink-0">
                            Застосовано
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nodes to create */}
            {nodesToCreate.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-900">
                  Вузли для генерації ({nodesToCreate.length})
                </h4>
                <div className="space-y-3">
                  {nodesToCreate.map((node) => (
                    <div
                      key={node.suggestedId}
                      className="flex items-start justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                          <span className="text-sm font-medium">{node.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {node.suggestedId}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          Замінює: {node.replaces.join(", ")}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {node.implementationApproach}
                        </p>
                        {node.packages.length > 0 && (
                          <div className="mt-1 flex gap-1">
                            {node.packages.map((pkg) => (
                              <Badge key={pkg} variant="secondary" className="text-xs">
                                {pkg}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleGenerate(node)}
                        disabled={generating === node.suggestedId}
                      >
                        {generating === node.suggestedId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Згенерувати вузол
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No external dependencies found */}
            {externalNodes.length === 0 && optimizations.length === 0 && nodesToCreate.length === 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700">
                <CheckCircle className="h-5 w-5" />
                Усі вузли сумісні з платформою. Зовнішніх залежностей не виявлено.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
