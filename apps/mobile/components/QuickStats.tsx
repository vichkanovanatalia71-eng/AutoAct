import { View, Text } from "react-native";

interface QuickStatsProps {
  stats: {
    activeWorkflows: number;
    executionsToday: number;
    systemKeyCost: number;
  };
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm">
      <Text className="text-2xl font-bold" style={{ color }}>
        {value}
      </Text>
      <Text className="text-xs text-gray-500 mt-1">{label}</Text>
    </View>
  );
}

export default function QuickStats({ stats }: QuickStatsProps) {
  return (
    <View className="flex-row px-4 mt-4 gap-3">
      <StatCard
        label="Активні воркфлоу"
        value={stats.activeWorkflows}
        color="#6366F1"
      />
      <StatCard
        label="Виконань сьогодні"
        value={stats.executionsToday}
        color="#22C55E"
      />
      <StatCard
        label="Витрати ключів"
        value={`$${stats.systemKeyCost.toFixed(2)}`}
        color="#F59E0B"
      />
    </View>
  );
}
