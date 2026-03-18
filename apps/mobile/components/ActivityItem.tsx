import { View, Text } from "react-native";
import { executionStatusColors } from "@autoact/ui-tokens";

interface ActivityItemProps {
  workflowName: string;
  status: string;
  durationMs?: number;
  triggerType?: string;
  startedAt: string;
  errorMessage?: string;
  showBorder?: boolean;
}

const statusLabels: Record<string, string> = {
  success: "Успішно",
  failed: "Помилка",
  running: "Виконується",
  pending: "Очікує",
};

const triggerLabels: Record<string, string> = {
  webhook: "Webhook",
  cron: "Розклад",
  manual: "Ручний",
};

function formatDuration(ms?: number): string {
  if (ms == null) return "";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}с`;
  return `${ms}мс`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return "Щойно";
  if (diffMin < 60) return `${diffMin} хв тому`;
  if (diffHour < 24) return `${diffHour} год тому`;
  return d.toLocaleDateString("uk-UA");
}

export default function ActivityItem({
  workflowName,
  status,
  durationMs,
  triggerType,
  startedAt,
  errorMessage,
  showBorder = true,
}: ActivityItemProps) {
  const style =
    executionStatusColors[status as keyof typeof executionStatusColors] ||
    executionStatusColors.pending;

  return (
    <View
      className={`px-4 py-3 ${showBorder ? "border-b border-gray-100" : ""}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
            {workflowName}
          </Text>
          <View className="flex-row items-center mt-1 gap-2">
            <View
              className="px-2 py-0.5 rounded"
              style={{ backgroundColor: style.bg }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: style.text }}
              >
                {statusLabels[status] || status}
              </Text>
            </View>
            {triggerType && (
              <Text className="text-xs text-gray-400">
                {triggerLabels[triggerType] || triggerType}
              </Text>
            )}
            {durationMs != null && (
              <Text className="text-xs text-gray-400">
                {formatDuration(durationMs)}
              </Text>
            )}
          </View>
        </View>
        <Text className="text-xs text-gray-400">{formatTime(startedAt)}</Text>
      </View>
      {errorMessage && (
        <Text className="text-xs text-danger-500 mt-1.5" numberOfLines={2}>
          {errorMessage}
        </Text>
      )}
    </View>
  );
}
