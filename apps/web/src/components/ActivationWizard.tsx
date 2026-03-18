"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Key,
  Zap,
  Clock,
  Globe,
  DollarSign,
  Shield,
} from "lucide-react";
import {
  getActivationPreview,
  activateWorkflow,
  createCredential,
  getWorkflow,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ActivationWizardProps {
  templateId: string;
  templateName: string;
  triggerType: string;
  open: boolean;
  onClose: () => void;
}

interface PreviewCredential {
  service: string;
  status: "matched" | "missing";
  credentialId?: string;
  credentialName?: string;
  systemKey?: {
    displayName: string;
    pricePerExecution: number;
  };
}

interface CredentialChoice {
  type: "user_credential" | "system_key" | "new_key";
  credentialId?: string;
  newKeyValue?: string;
  newKeyName?: string;
}

const CRON_PRESETS = [
  { label: "Щохвилини", value: "* * * * *" },
  { label: "Кожні 5 хвилин", value: "*/5 * * * *" },
  { label: "Щогодини", value: "0 * * * *" },
  { label: "Щодня о 9:00", value: "0 9 * * *" },
  { label: "Щодня о 18:00", value: "0 18 * * *" },
  { label: "Щопонеділка о 9:00", value: "0 9 * * 1" },
  { label: "1-го числа кожного місяця", value: "0 0 1 * *" },
];

export function ActivationWizard({
  templateId,
  templateName,
  triggerType,
  open,
  onClose,
}: ActivationWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activating, setActivating] = useState(false);

  // Step 1: Credential preview
  const [credentials, setCredentials] = useState<PreviewCredential[]>([]);
  const [choices, setChoices] = useState<Record<string, CredentialChoice>>({});

  // Step 3: Trigger config
  const [cronExpression, setCronExpression] = useState("0 9 * * *");

  // Post-activation
  const [activationResult, setActivationResult] = useState<{
    workflowId: string;
    webhookUrl?: string;
    testExecutionId: string;
  } | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load preview on open
  useEffect(() => {
    if (!open) {
      // Reset state when closed
      setStep(1);
      setError("");
      setActivationResult(null);
      setTestStatus(null);
      return;
    }

    async function loadPreview() {
      setLoading(true);
      try {
        const preview = await getActivationPreview(templateId);
        setCredentials(preview.credentials);

        // Auto-set choices for matched credentials
        const initialChoices: Record<string, CredentialChoice> = {};
        for (const cred of preview.credentials) {
          if (cred.status === "matched" && cred.credentialId) {
            initialChoices[cred.service] = {
              type: "user_credential",
              credentialId: cred.credentialId,
            };
          } else if (cred.systemKey) {
            initialChoices[cred.service] = { type: "system_key" };
          } else {
            initialChoices[cred.service] = { type: "new_key", newKeyValue: "", newKeyName: "" };
          }
        }
        setChoices(initialChoices);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Помилка завантаження");
      } finally {
        setLoading(false);
      }
    }

    loadPreview();
  }, [open, templateId]);

  // Poll test execution status
  useEffect(() => {
    if (!activationResult) return;

    let cancelled = false;
    const poll = async () => {
      for (let i = 0; i < 30; i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const wf = await getWorkflow(activationResult.workflowId);
          if (wf.status !== "testing" && wf.status !== "pending") {
            setTestStatus(wf.status);
            return;
          }
        } catch {
          // continue polling
        }
      }
      setTestStatus("timeout");
    };
    poll();
    return () => { cancelled = true; };
  }, [activationResult]);

  const updateChoice = useCallback(
    (service: string, update: Partial<CredentialChoice>) => {
      setChoices((prev) => ({
        ...prev,
        [service]: { ...prev[service], ...update },
      }));
    },
    []
  );

  const missingWithNewKey = credentials.filter(
    (c) => choices[c.service]?.type === "new_key"
  );

  const hasStep2 = missingWithNewKey.length > 0;

  const totalSteps = hasStep2 ? 4 : 3;

  const getEffectiveStep = (s: number) => {
    if (!hasStep2 && s >= 2) return s + 1;
    return s;
  };

  const systemKeyCost = credentials
    .filter((c) => choices[c.service]?.type === "system_key")
    .reduce((sum, c) => sum + (c.systemKey?.pricePerExecution || 0), 0);

  async function handleActivate() {
    setError("");
    setActivating(true);

    try {
      // Step 1: Create any new credentials
      for (const cred of missingWithNewKey) {
        const choice = choices[cred.service];
        if (choice.type === "new_key" && choice.newKeyValue) {
          const result = await createCredential({
            name: choice.newKeyName || `${cred.service} API Key`,
            serviceType: cred.service,
            data: { apiKey: choice.newKeyValue },
          });
          // Update choice to user_credential with new ID
          updateChoice(cred.service, {
            type: "user_credential",
            credentialId: (result as { id: string }).id,
          });
          choices[cred.service] = {
            type: "user_credential",
            credentialId: (result as { id: string }).id,
          };
        }
      }

      // Step 2: Build credential mapping
      const credentialMapping: Record<
        string,
        {
          type: "user_credential" | "system_key";
          credential_id?: string;
          service?: string;
          price_per_execution?: number;
        }
      > = {};

      for (const cred of credentials) {
        const choice = choices[cred.service];
        if (choice.type === "user_credential" || choice.type === "new_key") {
          credentialMapping[cred.service] = {
            type: "user_credential",
            credential_id: choice.credentialId,
          };
        } else if (choice.type === "system_key") {
          credentialMapping[cred.service] = {
            type: "system_key",
            service: cred.service,
            price_per_execution: cred.systemKey?.pricePerExecution,
          };
        }
      }

      // Step 3: Build trigger config
      const triggerConfig: { type: string; cron?: string } = { type: triggerType };
      if (triggerType === "cron") {
        triggerConfig.cron = cronExpression;
      }

      // Step 4: Activate
      const result = await activateWorkflow({
        templateId,
        credentialMapping,
        triggerConfig,
      });

      setActivationResult({
        workflowId: result.id,
        webhookUrl: result.webhookUrl,
        testExecutionId: result.testExecutionId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка активації");
    } finally {
      setActivating(false);
    }
  }

  function handleCopyWebhook() {
    if (activationResult?.webhookUrl) {
      navigator.clipboard.writeText(activationResult.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ---- Post-activation screen ----
  if (activationResult) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>
          {testStatus === null
            ? "Тестування воркфлоу..."
            : testStatus === "active"
              ? "Воркфлоу активований!"
              : "Потребує уваги"}
        </DialogTitle>

        <div className="mt-4 space-y-4">
          {testStatus === null && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              <p className="text-sm text-gray-600">
                Виконується тестовий запуск...
              </p>
            </div>
          )}

          {testStatus === "active" && (
            <div className="rounded-lg bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">
                    Воркфлоу активний і протестований
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    Тестовий запуск пройшов успішно. Воркфлоу готовий до роботи.
                  </p>
                </div>
              </div>
            </div>
          )}

          {testStatus === "needs_attention" && (
            <div className="rounded-lg bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">
                    Тест не пройшов повністю
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Деякі вузли потребують уваги. Перевірте логи виконання.
                  </p>
                </div>
              </div>
            </div>
          )}

          {testStatus === "timeout" && (
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                Тест ще виконується. Перевірте статус на сторінці воркфлоу.
              </p>
            </div>
          )}

          {activationResult.webhookUrl && (
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Webhook URL:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-gray-100 px-3 py-2 text-xs break-all">
                  {activationResult.webhookUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyWebhook}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => router.push(`/workflows/${activationResult.workflowId}`)}
          >
            Перейти до воркфлоу
          </Button>
        </DialogFooter>
      </Dialog>
    );
  }

  // ---- Wizard steps ----
  const effectiveStep = getEffectiveStep(step);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        Активація: {templateName}
      </DialogTitle>
      <DialogDescription>
        Крок {step} з {totalSteps}
      </DialogDescription>

      <div className="mt-4">
        {/* Step indicator */}
        <div className="mb-6 flex gap-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i + 1 <= step ? "bg-primary-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        )}

        {/* Step 1: Credential Check */}
        {!loading && effectiveStep === 1 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Key className="h-4 w-4" />
              Необхідні облікові дані
            </h3>

            {credentials.length === 0 && (
              <p className="text-sm text-gray-500">
                Цей воркфлоу не потребує облікових даних.
              </p>
            )}

            {credentials.map((cred) => {
              const choice = choices[cred.service];
              const isMatched = cred.status === "matched";

              return (
                <div
                  key={cred.service}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize text-gray-900">
                      {cred.service}
                    </span>
                    {isMatched ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        {cred.credentialName || "З вашого сховища"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-4 w-4" />
                        Відсутній
                      </span>
                    )}
                  </div>

                  {!isMatched && (
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`choice-${cred.service}`}
                          checked={choice?.type === "new_key"}
                          onChange={() =>
                            updateChoice(cred.service, {
                              type: "new_key",
                              newKeyValue: "",
                              newKeyName: "",
                            })
                          }
                          className="text-primary-600"
                        />
                        <span className="text-sm text-gray-700">
                          Додати власний ключ
                        </span>
                      </label>

                      {cred.systemKey && (
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`choice-${cred.service}`}
                            checked={choice?.type === "system_key"}
                            onChange={() =>
                              updateChoice(cred.service, { type: "system_key" })
                            }
                            className="text-primary-600"
                          />
                          <span className="text-sm text-gray-700">
                            Системний ключ платформи
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            <DollarSign className="mr-0.5 h-3 w-3" />+$
                            {cred.systemKey.pricePerExecution.toFixed(3)}
                            /запуск
                          </Badge>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Step 2: Fill missing keys (only if has new_key choices) */}
        {!loading && effectiveStep === 2 && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Shield className="h-4 w-4" />
              Введіть облікові дані
            </h3>

            {missingWithNewKey.map((cred) => {
              const choice = choices[cred.service];
              return (
                <div key={cred.service} className="space-y-2">
                  <Input
                    label={`${cred.service} — назва`}
                    placeholder={`Мій ${cred.service} ключ`}
                    value={choice?.newKeyName || ""}
                    onChange={(e) =>
                      updateChoice(cred.service, { newKeyName: e.target.value })
                    }
                  />
                  <Input
                    label={`${cred.service} — API ключ`}
                    placeholder="sk-..."
                    type="password"
                    value={choice?.newKeyValue || ""}
                    onChange={(e) =>
                      updateChoice(cred.service, { newKeyValue: e.target.value })
                    }
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Step 3: Trigger configuration */}
        {!loading && effectiveStep === 3 && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              {triggerType === "webhook" && <Zap className="h-4 w-4" />}
              {triggerType === "cron" && <Clock className="h-4 w-4" />}
              {triggerType === "manual" && <Globe className="h-4 w-4" />}
              Налаштування тригера
            </h3>

            {triggerType === "webhook" && (
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="mb-2 text-sm text-gray-600">
                  Після активації вам буде надано унікальний Webhook URL.
                  Надсилайте POST-запити на цей URL для запуску воркфлоу.
                </p>
                <div className="flex items-center gap-2 rounded bg-gray-100 px-3 py-2">
                  <Zap className="h-4 w-4 text-primary-600" />
                  <span className="text-sm text-gray-600">
                    URL буде згенеровано після активації
                  </span>
                </div>
              </div>
            )}

            {triggerType === "cron" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 p-4">
                  <Input
                    label="Cron вираз"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    placeholder="0 9 * * *"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Формат: хвилина годинаenь місяць день_тижня
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">
                    Швидкий вибір:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CRON_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setCronExpression(preset.value)}
                        className={`rounded-full px-3 py-1 text-xs transition ${
                          cronExpression === preset.value
                            ? "bg-primary-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {triggerType === "manual" && (
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-600">
                  Цей воркфлоу запускається вручну. Ви зможете запустити його
                  з дашборду у будь-який момент.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Summary */}
        {!loading && effectiveStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Підсумок</h3>

            <Card>
              <CardContent className="space-y-3 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Воркфлоу</span>
                  <span className="font-medium text-gray-900">
                    {templateName}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Тригер</span>
                  <span className="font-medium text-gray-900">
                    {triggerType === "webhook"
                      ? "Webhook"
                      : triggerType === "cron"
                        ? `Cron: ${cronExpression}`
                        : "Ручний запуск"}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <p className="mb-2 text-xs font-medium text-gray-500">
                    Облікові дані:
                  </p>
                  {credentials.map((cred) => {
                    const choice = choices[cred.service];
                    return (
                      <div
                        key={cred.service}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm capitalize text-gray-700">
                          {cred.service}
                        </span>
                        {choice?.type === "system_key" ? (
                          <Badge variant="secondary" className="text-xs">
                            системний ключ (+$
                            {cred.systemKey?.pricePerExecution.toFixed(3)}
                            /запуск)
                          </Badge>
                        ) : (
                          <span className="text-xs text-green-600">
                            власний ключ
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {systemKeyCost > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <div className="rounded-lg bg-amber-50 p-3">
                      <p className="text-xs text-amber-800">
                        <strong>Вартість системних ключів:</strong>{" "}
                        ~${systemKeyCost.toFixed(3)}/запуск
                      </p>
                      <p className="mt-1 text-xs text-amber-700">
                        Нараховується окремо до вашого плану через Stripe.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <DialogFooter>
        <div className="flex w-full justify-between">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Назад
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Скасувати
            </Button>
            {step < totalSteps ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Далі
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleActivate} disabled={activating}>
                {activating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Активація...
                  </>
                ) : (
                  "Активувати"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
