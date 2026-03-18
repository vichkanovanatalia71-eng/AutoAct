import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useWorkflows } from "@autoact/hooks";
import type { WorkflowListItem } from "@autoact/hooks";
import WorkflowCard from "../../../components/WorkflowCard";

const TABS = [
  { key: "all", label: "Усі" },
  { key: "active", label: "Активні" },
  { key: "paused", label: "Пауза" },
  { key: "needs_attention", label: "Увага" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function WorkflowsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const router = useRouter();

  const filters =
    activeTab === "all" ? undefined : { status: activeTab };

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useWorkflows(filters);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: WorkflowListItem }) => (
      <WorkflowCard
        workflow={item}
        onPress={() => router.push(`/(cabinet)/workflows/${item.id}`)}
      />
    ),
    [router]
  );

  const keyExtractor = useCallback((item: WorkflowListItem) => item.id, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">Воркфлоу</Text>
      </View>

      <View className="flex-row px-4 mb-3">
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            className={`mr-2 px-4 py-2 rounded-full ${
              activeTab === tab.key
                ? "bg-primary-600"
                : "bg-white border border-gray-200"
            }`}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === tab.key ? "text-white" : "text-gray-600"
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text className="text-gray-500 mt-4">Завантаження...</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-5xl mb-4">⚠️</Text>
          <Text className="text-lg font-semibold text-gray-900 mb-2">
            Помилка завантаження
          </Text>
          <Text className="text-sm text-gray-500 text-center">
            {(error as Error)?.message || "Спробуйте оновити"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data || []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Text className="text-5xl mb-4">📭</Text>
              <Text className="text-base font-medium text-gray-500">
                Воркфлоу не знайдено
              </Text>
              <Text className="text-sm text-gray-400 mt-1">
                Активуйте шаблон у каталозі
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
