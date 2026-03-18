import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

interface AlertBannerProps {
  workflowName: string;
  message: string;
  type: string;
  workflowId: string;
}

export default function AlertBanner({
  workflowName,
  message,
  type,
  workflowId,
}: AlertBannerProps) {
  const router = useRouter();

  const isError = type === "error";
  const bgClass = isError ? "bg-danger-50" : "bg-warning-50";
  const borderClass = isError ? "border-danger-200" : "border-warning-200";
  const textClass = isError ? "text-danger-700" : "text-warning-700";
  const subtextClass = isError ? "text-danger-600" : "text-warning-600";

  return (
    <TouchableOpacity
      className={`${bgClass} ${borderClass} border rounded-2xl p-4 mb-3`}
      onPress={() => router.push(`/(cabinet)/workflows/${workflowId}`)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start">
        <Text className="text-xl mr-3">
          {isError ? "🔴" : "⚠️"}
        </Text>
        <View className="flex-1">
          <Text className={`text-sm font-semibold ${textClass}`}>
            {workflowName}
          </Text>
          <Text className={`text-xs ${subtextClass} mt-1`}>{message}</Text>
        </View>
        <Text className={`text-xs ${subtextClass}`}>Деталі ›</Text>
      </View>
    </TouchableOpacity>
  );
}
