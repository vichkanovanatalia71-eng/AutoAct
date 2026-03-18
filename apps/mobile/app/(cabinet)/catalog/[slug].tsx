import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTemplate, useActivateWorkflow } from "@autoact/hooks";

export default function TemplateDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const { data: template, isLoading, isError, error } = useTemplate(slug || "");
  const activateWorkflow = useActivateWorkflow();

  const handleActivate = () => {
    if (!template) return;
    Alert.alert(
      "Активувати шаблон?",
      `Воркфлоу "${template.name}" буде створено.`,
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Активувати",
          onPress: () => {
            activateWorkflow.mutate(
              {
                templateId: template.id,
                credentialMapping: {},
              },
              {
                onSuccess: () => {
                  Alert.alert("Готово", "Воркфлоу активовано!");
                  router.push("/(cabinet)/workflows");
                },
                onError: (err: any) => {
                  Alert.alert(
                    "Помилка",
                    err.message || "Не вдалось активувати"
                  );
                },
              }
            );
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }

  if (isError || !template) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-5xl mb-4">⚠️</Text>
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          Помилка
        </Text>
        <Text className="text-sm text-gray-500 text-center">
          {(error as Error)?.message || "Шаблон не знайдено"}
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
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <View className="px-4 pt-4 pb-2">
          <TouchableOpacity onPress={() => router.back()} className="mb-3">
            <Text className="text-primary-600 text-sm font-medium">
              ← Назад до каталогу
            </Text>
          </TouchableOpacity>
        </View>

        <View className="px-4">
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <View className="flex-row items-center mb-3">
              {template.icon && (
                <Text className="text-4xl mr-3">{template.icon}</Text>
              )}
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900">
                  {template.name}
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  {template.category}
                </Text>
              </View>
            </View>

            {template.description && (
              <Text className="text-sm text-gray-600 leading-5 mt-2">
                {template.description}
              </Text>
            )}

            <View className="flex-row flex-wrap gap-2 mt-4">
              <View className="bg-primary-50 px-3 py-1.5 rounded-lg">
                <Text className="text-xs text-primary-700 font-medium">
                  {triggerLabels[template.triggerType] || template.triggerType}
                </Text>
              </View>
              <View className="bg-gray-100 px-3 py-1.5 rounded-lg">
                <Text className="text-xs text-gray-600">
                  {template.nodeCount} вузлів
                </Text>
              </View>
              {template.activationsCount != null && (
                <View className="bg-success-50 px-3 py-1.5 rounded-lg">
                  <Text className="text-xs text-success-700">
                    {template.activationsCount} активацій
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Required Credentials */}
        {template.requiredCredentials.length > 0 && (
          <View className="px-4 mt-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Необхідні облікові дані
            </Text>
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              {template.requiredCredentials.map((cred, idx) => (
                <View
                  key={cred}
                  className={`flex-row items-center py-3 ${
                    idx < template.requiredCredentials.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <Text className="text-2xl mr-3">🔑</Text>
                  <Text className="text-sm text-gray-700 font-medium">
                    {cred}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tags */}
        {template.tags.length > 0 && (
          <View className="px-4 mt-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Теги
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {template.tags.map((tag) => (
                <View key={tag} className="bg-gray-100 px-3 py-1.5 rounded-lg">
                  <Text className="text-xs text-gray-600">#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activate Button */}
        <View className="px-4 mt-6">
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${
              activateWorkflow.isPending ? "bg-primary-400" : "bg-primary-600"
            }`}
            onPress={handleActivate}
            disabled={activateWorkflow.isPending}
            activeOpacity={0.8}
          >
            {activateWorkflow.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Активувати воркфлоу
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
