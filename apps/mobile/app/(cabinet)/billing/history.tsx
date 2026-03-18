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
import { useBillingHistory } from "@autoact/hooks";
import type { BillingHistoryItem } from "@autoact/hooks";

const statusLabels: Record<string, string> = {
  paid: "Оплачено",
  failed: "Невдало",
  pending: "Очікує",
};

const statusClr: Record<string, string> = {
  paid: "text-success-600",
  failed: "text-danger-600",
  pending: "text-warning-600",
};

export default function BillingHistoryScreen() {
  const [page, setPage] = useState(1);
  const router = useRouter();

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useBillingHistory(page);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: BillingHistoryItem }) => (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-base font-semibold text-gray-900">
            ${(item.amount / 100).toFixed(2)}
          </Text>
          <Text
            className={`text-sm font-medium ${
              statusClr[item.status] || "text-gray-500"
            }`}
          >
            {statusLabels[item.status] || item.status}
          </Text>
        </View>
        <Text className="text-sm text-gray-600">{item.description}</Text>
        <Text className="text-xs text-gray-400 mt-2">
          {new Date(item.date).toLocaleDateString("uk-UA")}
        </Text>
      </View>
    ),
    []
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="mb-2">
          <Text className="text-primary-600 text-sm font-medium">
            ← Назад
          </Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900">
          Історія платежів
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-5xl mb-4">⚠️</Text>
          <Text className="text-base font-semibold text-gray-900 mb-2">
            Помилка
          </Text>
          <Text className="text-sm text-gray-500 text-center">
            {(error as Error)?.message}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data?.data || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Text className="text-5xl mb-4">📋</Text>
              <Text className="text-base font-medium text-gray-500">
                Немає історії платежів
              </Text>
            </View>
          }
          ListFooterComponent={
            data && data.totalPages > 1 ? (
              <View className="flex-row justify-center gap-4 mt-4">
                <TouchableOpacity
                  className={`px-4 py-2 rounded-lg ${
                    page <= 1 ? "bg-gray-100" : "bg-primary-100"
                  }`}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <Text
                    className={`text-sm font-medium ${
                      page <= 1 ? "text-gray-400" : "text-primary-700"
                    }`}
                  >
                    Попередня
                  </Text>
                </TouchableOpacity>
                <Text className="text-sm text-gray-500 self-center">
                  {page} / {data.totalPages}
                </Text>
                <TouchableOpacity
                  className={`px-4 py-2 rounded-lg ${
                    page >= data.totalPages ? "bg-gray-100" : "bg-primary-100"
                  }`}
                  onPress={() =>
                    setPage((p) => Math.min(data.totalPages, p + 1))
                  }
                  disabled={page >= data.totalPages}
                >
                  <Text
                    className={`text-sm font-medium ${
                      page >= data.totalPages
                        ? "text-gray-400"
                        : "text-primary-700"
                    }`}
                  >
                    Наступна
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
