import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import {
  useWorkflow,
  useWorkflowExecutions,
  usePauseWorkflow,
  useResumeWorkflow,
  useRunWorkflow,
} from "@autoact/hooks";
import { statusColors } from "@autoact/ui-tokens";

function StatusBadge({ status }: { status: string }) {
  const style =
    statusColors[status as keyof typeof statusColors] || statusColors.pending;
  const labels: Record<string, string> = {
    active: "Активний",
    paused: "Пауза",
    error: "Помилка",
    needs_attention: "Потребує уваги",
    pending: "Очікує",
    testing: "Тестування",
  };

  return (
    <View
      className="flex-row items-center px-3 py-1 rounded-full"
      style={{ backgroundColor: style.bg }}
    >
      <View
        className="w-2 h-2 rounded-full mr-2"
        style={{ backgroundColor: style.dot }}
      />
      <Text className="text-xs font-semibold" style={{ color: style.text }}>
        {labels[status] || status}
      </Text>
    </View>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
      <Text className="text-lg font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-500 mt-1">{label}</Text>
    </View>
  );
}

export default function WorkflowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: workflow,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useWorkflow(id || "");

  const { data: executions } = useWorkflowExecutions(id || "");

  const pauseWorkflow = usePauseWorkflow();
  const resumeWorkflow = useResumeWorkflow();
  const runWorkflow = useRunWorkflow();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handlePause = () => {
    if (!id) return;
    Alert.alert("Призупинити воркфлоу?", "Воркфлоу буде зупинено.", [
      { text: "Скасувати", style: "cancel" },
      {
        text: "Призупинити",
        onPress: () => pauseWorkflow.mutate(id),
      },
    ]);
  };

  const handleResume = () => {
    if (!id) return;
    resumeWorkflow.mutate(id);
  };

  const handleRun = () => {
    if (!id) return;
    runWorkflow.mutate(id, {
      onSuccess: () =>
        Alert.alert("Готово", "Тестовий запуск розпочато"),
    });
  };

  const copyWebhook = async () => {
    if (workflow?.webhookUrl) {
      await Clipboard.setStringAsync(workflow.webhookUrl);
      Alert.alert("Скопійовано", "Webhook URL скопійовано в буфер обміну");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }

  if (isError || !workflow) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-5xl mb-4">⚠️</Text>
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          Помилка
        </Text>
        <Text className="text-sm text-gray-500 text-center">
          {(error as Error)?.message || "Воркфлоу не знайдено"}
        </Text>
        <TouchableOpacity
          className="mt-4 bg-primary-600 px-6 py-3 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Назад</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const triggerLabels: Record<string, string> = {
    webhook: "Webhook",
    cron: "За розкладом",
    manual: "Ручний",
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="px-4 pt-4 pb-2">
          <TouchableOpacity onPress={() => router.back()} className="mb-3">
            <Text className="text-primary-600 text-sm font-medium">
              ← Назад
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-xl font-bold text-gray-900">
                {workflow.name}
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                {workflow.templateName}
              </Text>
            </View>
            <StatusBadge status={workflow.status} />
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row px-4 mt-3 gap-2">
          {workflow.status === "active" ? (
            <TouchableOpacity
              className="flex-1 bg-warning-100 rounded-xl py-3 items-center"
              onPress={handlePause}
            >
              <Text className="text-warning-700 font-semibold text-sm">
                Призупинити
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="flex-1 bg-success-100 rounded-xl py-3 items-center"
              onPress={handleResume}
            >
              <Text className="text-success-700 font-semibold text-sm">
                Відновити
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="flex-1 bg-primary-100 rounded-xl py-3 items-center"
            onPress={handleRun}
          >
            <Text className="text-primary-700 font-semibold text-sm">
              Тест. запуск
            </Text>
          </TouchableOpacity>
        </View>

        {/* Trigger Info */}
        <View className="px-4 mt-4">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-sm font-semibold text-gray-900 mb-2">
              Тригер
            </Text>
            <Text className="text-sm text-gray-600">
              {triggerLabels[workflow.triggerType] || workflow.triggerType}
            </Text>
            {workflow.webhookUrl && (
              <TouchableOpacity
                className="mt-3 bg-gray-50 rounded-lg p-3"
                onPress={copyWebhook}
                activeOpacity={0.7}
              >
                <Text className="text-xs text-gray-500 mb-1">
                  Webhook URL (натисніть щоб скопіювати)
                </Text>
                <Text
                  className="text-xs text-primary-600 font-mono"
                  numberOfLines={2}
                >
                  {workflow.webhookUrl}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats */}
        <View className="px-4 mt-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Статистика
          </Text>
          <View className="flex-row gap-2">
            <StatCard label="Усього запусків" value={workflow.executionCount} />
            <StatCard
              label="Успішність"
              value={`${Math.round(workflow.successRate)}%`}
            />
            <StatCard
              label="Сер. час"
              value={
                workflow.avgDurationMs >= 1000
                  ? `${(workflow.avgDurationMs / 1000).toFixed(1)}с`
                  : `${workflow.avgDurationMs}мс`
              }
            />
          </View>
        </View>

        {/* Credential Mapping */}
        {workflow.credentialMapping &&
          Object.keys(workflow.credentialMapping).length > 0 && (
            <View className="px-4 mt-4">
              <Text className="text-base font-semibold text-gray-900 mb-3">
                Облікові дані
              </Text>
              <View className="bg-white rounded-2xl p-4 shadow-sm">
                {Object.entries(workflow.credentialMapping).map(
                  ([service, value]) => (
                    <View
                      key={service}
                      className="flex-row items-center justify-between py-2 border-b border-gray-100"
                    >
                      <Text className="text-sm text-gray-600">{service}</Text>
                      <Text className="text-sm font-medium text-gray-900">
                        {typeof value === "object" && value !== null
                          ? (value as any).type === "system_key"
                            ? "Системний ключ"
                            : "Підключено"
                          : "Підключено"}
                      </Text>
                    </View>
                  )
                )}
              </View>
            </View>
          )}

        {/* Top Error */}
        {workflow.topError && (
          <View className="px-4 mt-4">
            <View className="bg-danger-50 rounded-2xl p-4 border border-danger-200">
              <Text className="text-sm font-semibold text-danger-700 mb-1">
                Найчастіша помилка
              </Text>
              <Text className="text-sm text-danger-600">
                {workflow.topError.message}
              </Text>
              <Text className="text-xs text-danger-400 mt-1">
                Вузол: {workflow.topError.nodeId} | Кількість:{" "}
                {workflow.topError.count}
              </Text>
            </View>
          </View>
        )}

        {/* Execution History */}
        <View className="px-4 mt-6">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Історія виконань
          </Text>
          {executions?.data && executions.data.length > 0 ? (
            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {executions.data.map((exec, idx) => {
                const statusLabel: Record<string, string> = {
                  success: "Успішно",
                  failed: "Помилка",
                  running: "Виконується",
                  pending: "Очікує",
                };
                const statusClr: Record<string, string> = {
                  success: "text-success-600",
                  failed: "text-danger-600",
                  running: "text-primary-600",
                  pending: "text-gray-500",
                };
                return (
                  <View
                    key={exec.id}
                    className={`px-4 py-3 ${
                      idx < executions.data.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`text-sm font-medium ${
                          statusClr[exec.status] || "text-gray-500"
                        }`}
                      >
                        {statusLabel[exec.status] || exec.status}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        {new Date(exec.startedAt).toLocaleString("uk-UA")}
                      </Text>
                    </View>
                    {exec.durationMs != null && (
                      <Text className="text-xs text-gray-400 mt-1">
                        Час:{" "}
                        {exec.durationMs >= 1000
                          ? `${(exec.durationMs / 1000).toFixed(1)}с`
                          : `${exec.durationMs}мс`}
                      </Text>
                    )}
                    {exec.errorMessage && (
                      <Text
                        className="text-xs text-danger-500 mt-1"
                        numberOfLines={2}
                      >
                        {exec.errorMessage}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="items-center py-8">
              <Text className="text-sm text-gray-400">
                Ще немає виконань
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
