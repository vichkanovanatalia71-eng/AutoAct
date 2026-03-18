import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTemplates } from "@autoact/hooks";
import type { TemplateDTO } from "@autoact/types";

const CATEGORIES = [
  { key: "", label: "Усі" },
  { key: "marketing", label: "Маркетинг" },
  { key: "sales", label: "Продажі" },
  { key: "support", label: "Підтримка" },
  { key: "development", label: "Розробка" },
  { key: "hr", label: "HR" },
  { key: "finance", label: "Фінанси" },
  { key: "other", label: "Інше" },
];

function TemplateCard({
  template,
  onPress,
}: {
  template: TemplateDTO;
  onPress: () => void;
}) {
  const triggerLabels: Record<string, string> = {
    webhook: "Webhook",
    cron: "За розкладом",
    manual: "Ручний",
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-base font-semibold text-gray-900">
            {template.name}
          </Text>
          {template.description && (
            <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
              {template.description}
            </Text>
          )}
        </View>
        {template.icon && (
          <Text className="text-2xl">{template.icon}</Text>
        )}
      </View>

      <View className="flex-row mt-3 flex-wrap gap-2">
        <View className="bg-primary-50 px-2 py-1 rounded-md">
          <Text className="text-xs text-primary-700 font-medium">
            {triggerLabels[template.triggerType] || template.triggerType}
          </Text>
        </View>
        <View className="bg-gray-100 px-2 py-1 rounded-md">
          <Text className="text-xs text-gray-600">
            {template.nodeCount} вузлів
          </Text>
        </View>
        <View className="bg-gray-100 px-2 py-1 rounded-md">
          <Text className="text-xs text-gray-600">{template.category}</Text>
        </View>
        {template.activationsCount != null && (
          <View className="bg-success-50 px-2 py-1 rounded-md">
            <Text className="text-xs text-success-700">
              {template.activationsCount} активацій
            </Text>
          </View>
        )}
      </View>

      {template.tags.length > 0 && (
        <View className="flex-row mt-2 flex-wrap gap-1">
          {template.tags.slice(0, 4).map((tag) => (
            <Text key={tag} className="text-xs text-gray-400">
              #{tag}
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function CatalogScreen() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const router = useRouter();

  const params: Record<string, string> = {};
  if (search.trim()) params.search = search.trim();
  if (category) params.category = category;

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useTemplates(Object.keys(params).length > 0 ? params : undefined);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const templates = data?.data || [];

  const renderItem = useCallback(
    ({ item }: { item: TemplateDTO }) => (
      <TemplateCard
        template={item}
        onPress={() =>
          router.push(`/(cabinet)/catalog/${item.slug || item.id}`)
        }
      />
    ),
    [router]
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">Каталог</Text>
      </View>

      <View className="px-4 mb-3">
        <TextInput
          className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
          placeholder="Пошук шаблонів..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <View className="mb-3">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`mr-2 px-4 py-2 rounded-full ${
                category === item.key
                  ? "bg-primary-600"
                  : "bg-white border border-gray-200"
              }`}
              onPress={() => setCategory(item.key)}
            >
              <Text
                className={`text-sm font-medium ${
                  category === item.key ? "text-white" : "text-gray-600"
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text className="text-gray-500 mt-4">Завантаження...</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-5xl mb-4">⚠️</Text>
          <Text className="text-base font-semibold text-gray-900 mb-2">
            Помилка завантаження
          </Text>
          <Text className="text-sm text-gray-500 text-center">
            {(error as Error)?.message}
          </Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Text className="text-5xl mb-4">🔍</Text>
              <Text className="text-base font-medium text-gray-500">
                Шаблонів не знайдено
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
