import { View, Text, TouchableOpacity } from "react-native";
import { statusColors } from "@autoact/ui-tokens";
import type { WorkflowListItem } from "@autoact/hooks";

interface WorkflowCardProps {
  workflow: WorkflowListItem;
  onPress: () => void;
}

const statusLabels: Record<string, string> = {
  active: "Активний",
  paused: "Пауза",
  error: "Помилка",
  needs_attention: "Потребує уваги",
  pending: "Очікує",
  testing: "Тестування",
};

const triggerLabels: Record<string, string> = {
  webhook: "Webhook",
  cron: "За розкладом",
  manual: "Ручний",
};

export default function WorkflowCard({ workflow, onPress }: WorkflowCardProps) {
  const style =
    statusColors[workflow.status as keyof typeof statusColors] ||
    statusColors.pending;

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-base font-semibold text-gray-900">
            {workflow.name}
          </Text>
          <Text className="text-sm text-gray-500 mt-0.5">
            {workflow.templateName}
          </Text>
        </View>
        <View
          className="flex-row items-center px-2.5 py-1 rounded-full"
          style={{ backgroundColor: style.bg }}
        >
          <View
            className="w-1.5 h-1.5 rounded-full mr-1.5"
            style={{ backgroundColor: style.dot }}
          />
          <Text className="text-xs font-semibold" style={{ color: style.text }}>
            {statusLabels[workflow.status] || workflow.status}
          </Text>
        </View>
      </View>

      <View className="flex-row mt-3 gap-3">
        <View className="flex-row items-center">
          <Text className="text-xs text-gray-400 mr-1">Тригер:</Text>
          <Text className="text-xs text-gray-600 font-medium">
            {triggerLabels[workflow.triggerType] || workflow.triggerType}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-xs text-gray-400 mr-1">Виконань:</Text>
          <Text className="text-xs text-gray-600 font-medium">
            {workflow.executionCount}
          </Text>
        </View>
        {workflow.errorCount > 0 && (
          <View className="flex-row items-center">
            <Text className="text-xs text-danger-400 mr-1">Помилок:</Text>
            <Text className="text-xs text-danger-600 font-medium">
              {workflow.errorCount}
            </Text>
          </View>
        )}
      </View>

      {workflow.lastExecution && (
        <Text className="text-xs text-gray-400 mt-2">
          Останній запуск:{" "}
          {new Date(workflow.lastExecution).toLocaleString("uk-UA")}
        </Text>
      )}

      {workflow.needsReconfiguration && (
        <View className="bg-warning-50 rounded-lg px-3 py-2 mt-2">
          <Text className="text-xs text-warning-700 font-medium">
            Потребує переналаштування
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
