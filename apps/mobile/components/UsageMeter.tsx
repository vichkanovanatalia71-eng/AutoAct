import { View, Text } from "react-native";

interface UsageMeterProps {
  label: string;
  current: number;
  limit: number;
  color: string;
}

export default function UsageMeter({
  label,
  current,
  limit,
  color,
}: UsageMeterProps) {
  const isUnlimited = !isFinite(limit);
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isWarning = percentage >= 80;
  const isDanger = percentage >= 95;

  const barColor = isDanger ? "#EF4444" : isWarning ? "#F59E0B" : color;

  return (
    <View>
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-sm text-gray-600">{label}</Text>
        <Text className="text-sm font-semibold text-gray-900">
          {current.toLocaleString("uk-UA")}
          {isUnlimited ? "" : ` / ${limit.toLocaleString("uk-UA")}`}
        </Text>
      </View>
      {!isUnlimited && (
        <View className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${percentage}%`,
              backgroundColor: barColor,
            }}
          />
        </View>
      )}
      {isUnlimited && (
        <Text className="text-xs text-gray-400">Необмежено</Text>
      )}
    </View>
  );
}
