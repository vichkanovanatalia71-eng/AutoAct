import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDashboard } from "@autoact/hooks";
import QuickStats from "../../components/QuickStats";
import UsageMeter from "../../components/UsageMeter";
import AlertBanner from "../../components/AlertBanner";
import ActivityItem from "../../components/ActivityItem";

export default function DashboardScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useDashboard();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className="text-gray-500 mt-4">Завантаження...</Text>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-5xl mb-4">⚠️</Text>
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          Помилка завантаження
        </Text>
        <Text className="text-sm text-gray-500 text-center">
          {(error as Error)?.message || "Спробуйте оновити сторінку"}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
      >
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-gray-900">Головна</Text>
          <Text className="text-sm text-gray-500 mt-1">
            Огляд вашого акаунту
          </Text>
        </View>

        {data?.alerts && data.alerts.length > 0 && (
          <View className="px-4 mt-2">
            {data.alerts.map((alert) => (
              <AlertBanner
                key={alert.id}
                workflowName={alert.workflowName}
                message={alert.message}
                type={alert.type}
                workflowId={alert.workflowId}
              />
            ))}
          </View>
        )}

        {data?.stats && <QuickStats stats={data.stats} />}

        {data?.usage && (
          <View className="px-4 mt-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Використання
            </Text>
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <UsageMeter
                label="Виконання"
                current={data.usage.executionsUsed}
                limit={data.usage.executionsLimit}
                color="#6366F1"
              />
              <View className="h-4" />
              <UsageMeter
                label="Воркфлоу"
                current={data.usage.workflowsUsed}
                limit={data.usage.workflowsLimit}
                color="#22C55E"
              />
            </View>
          </View>
        )}

        {data?.recentActivity && data.recentActivity.length > 0 && (
          <View className="px-4 mt-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Остання активність
            </Text>
            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {data.recentActivity.map((item, index) => (
                <ActivityItem
                  key={item.id}
                  workflowName={item.workflowName}
                  status={item.status}
                  durationMs={item.durationMs}
                  triggerType={item.triggerType}
                  startedAt={item.startedAt}
                  errorMessage={item.errorMessage}
                  showBorder={index < data.recentActivity.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        {data?.recentActivity?.length === 0 && (
          <View className="px-4 mt-6 items-center">
            <Text className="text-gray-400 text-sm">
              Ще немає виконань
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
