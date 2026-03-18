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
import { useRouter } from "expo-router";
import { useSubscription, useChangePlan } from "@autoact/hooks";
import { PLAN_LIMITS, PlanType } from "@autoact/types";
import { planColors } from "@autoact/ui-tokens";
import UsageMeter from "../../../components/UsageMeter";

const planLabels: Record<string, string> = {
  free: "Безкоштовний",
  pro: "Професійний",
  business: "Бізнес",
};

export default function BillingScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useSubscription();
  const changePlan = useChangePlan();
  const router = useRouter();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleUpgrade = (plan: string) => {
    Alert.alert(
      "Змінити план?",
      `Перейти на план "${planLabels[plan] || plan}"?`,
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Підтвердити",
          onPress: () => {
            changePlan.mutate(plan, {
              onSuccess: (res) => {
                if (res?.checkoutUrl || res?.url) {
                  Alert.alert(
                    "Перенаправлення",
                    "Відкрийте посилання для оплати у браузері"
                  );
                } else {
                  Alert.alert("Готово", "План успішно змінено");
                }
              },
              onError: (err: any) => {
                Alert.alert("Помилка", err.message || "Спробуйте ще раз");
              },
            });
          },
        },
      ]
    );
  };

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
          Помилка
        </Text>
        <Text className="text-sm text-gray-500 text-center">
          {(error as Error)?.message}
        </Text>
      </SafeAreaView>
    );
  }

  const plan = data?.plan || PlanType.FREE;
  const pColors = planColors[plan as keyof typeof planColors] || planColors.free;

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
          <Text className="text-2xl font-bold text-gray-900">Білінг</Text>
        </View>

        {/* Current Plan Card */}
        <View className="px-4 mt-2">
          <View
            className="rounded-2xl p-5 shadow-sm"
            style={{
              backgroundColor: pColors.bg,
              borderWidth: 1,
              borderColor: pColors.border,
            }}
          >
            <Text className="text-sm font-medium" style={{ color: pColors.text }}>
              Поточний план
            </Text>
            <Text
              className="text-2xl font-bold mt-1"
              style={{ color: pColors.text }}
            >
              {planLabels[plan] || plan}
            </Text>
            {data?.periodEnd && (
              <Text className="text-sm mt-2" style={{ color: pColors.text }}>
                Наступне поновлення:{" "}
                {new Date(data.periodEnd).toLocaleDateString("uk-UA")}
              </Text>
            )}
            <Text className="text-sm mt-1" style={{ color: pColors.text }}>
              Статус: {data?.status === "active" ? "Активний" : data?.status}
            </Text>
          </View>
        </View>

        {/* Usage */}
        {data && (
          <View className="px-4 mt-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Використання
            </Text>
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <UsageMeter
                label="Виконання"
                current={data.executionsUsed}
                limit={data.executionsLimit}
                color="#6366F1"
              />
              <View className="h-4" />
              <UsageMeter
                label="Воркфлоу"
                current={data.workflowsUsed}
                limit={data.workflowsLimit}
                color="#22C55E"
              />
              {data.systemKeyCostCents > 0 && (
                <>
                  <View className="h-4" />
                  <View>
                    <Text className="text-sm text-gray-600 mb-1">
                      Витрати на системні ключі
                    </Text>
                    <Text className="text-lg font-bold text-gray-900">
                      ${(data.systemKeyCostCents / 100).toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Quotas */}
        {data && (
          <View className="px-4 mt-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Квоти плану
            </Text>
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <View className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="text-sm text-gray-600">
                  Ліміт виконань
                </Text>
                <Text className="text-sm font-semibold text-gray-900">
                  {data.executionsLimit === Infinity
                    ? "Необмежено"
                    : data.executionsLimit.toLocaleString("uk-UA")}
                </Text>
              </View>
              <View className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="text-sm text-gray-600">
                  Ліміт воркфлоу
                </Text>
                <Text className="text-sm font-semibold text-gray-900">
                  {data.workflowsLimit === Infinity
                    ? "Необмежено"
                    : data.workflowsLimit}
                </Text>
              </View>
              {data.parallelLimit != null && (
                <View className="flex-row justify-between py-2 border-b border-gray-100">
                  <Text className="text-sm text-gray-600">
                    Паралельні виконання
                  </Text>
                  <Text className="text-sm font-semibold text-gray-900">
                    {data.parallelLimit}
                  </Text>
                </View>
              )}
              {data.maxExecutionTime != null && (
                <View className="flex-row justify-between py-2">
                  <Text className="text-sm text-gray-600">
                    Макс. час виконання
                  </Text>
                  <Text className="text-sm font-semibold text-gray-900">
                    {data.maxExecutionTime}с
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Upgrade buttons */}
        {plan !== PlanType.BUSINESS && (
          <View className="px-4 mt-6">
            {plan === PlanType.FREE && (
              <TouchableOpacity
                className="bg-primary-600 rounded-xl py-4 items-center mb-3"
                onPress={() => handleUpgrade("pro")}
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-base">
                  Оновити до Pro - $29/міс
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="bg-warning-600 rounded-xl py-4 items-center"
              onPress={() => handleUpgrade("business")}
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-base">
                Оновити до Business - $99/міс
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* History link */}
        <View className="px-4 mt-4">
          <TouchableOpacity
            className="bg-white rounded-xl py-4 items-center border border-gray-200"
            onPress={() => router.push("/(cabinet)/billing/history")}
            activeOpacity={0.7}
          >
            <Text className="text-gray-700 font-medium text-sm">
              Історія платежів
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
