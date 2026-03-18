import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  useUserApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
} from "@autoact/hooks";
import type { UserApiKeyDTO } from "@autoact/types";

export default function ApiKeysScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useUserApiKeys();
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const [showModal, setShowModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCreate = () => {
    if (!keyName.trim()) {
      Alert.alert("Помилка", "Введіть назву ключа");
      return;
    }

    createApiKey.mutate(
      { name: keyName.trim() },
      {
        onSuccess: (result) => {
          setNewKey(result.key);
          setKeyName("");
        },
        onError: (err: any) => {
          Alert.alert("Помилка", err.message || "Спробуйте ще раз");
        },
      }
    );
  };

  const handleDelete = (key: UserApiKeyDTO) => {
    Alert.alert("Видалити ключ?", `Видалити "${key.name}"?`, [
      { text: "Скасувати", style: "cancel" },
      {
        text: "Видалити",
        style: "destructive",
        onPress: () => deleteApiKey.mutate(key.id),
      },
    ]);
  };

  const renderItem = useCallback(
    ({ item }: { item: UserApiKeyDTO }) => (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-base font-semibold text-gray-900">
              {item.name}
            </Text>
            <Text className="text-sm text-gray-500 mt-1 font-mono">
              {item.keyPrefix}...
            </Text>
            <View className="flex-row mt-2 gap-4">
              <Text className="text-xs text-gray-400">
                Створено:{" "}
                {new Date(item.createdAt).toLocaleDateString("uk-UA")}
              </Text>
              {item.lastUsedAt && (
                <Text className="text-xs text-gray-400">
                  Використано:{" "}
                  {new Date(item.lastUsedAt).toLocaleDateString("uk-UA")}
                </Text>
              )}
            </View>
            {item.expiresAt && (
              <Text className="text-xs text-warning-600 mt-1">
                Дійсний до:{" "}
                {new Date(item.expiresAt).toLocaleDateString("uk-UA")}
              </Text>
            )}
          </View>
          <TouchableOpacity
            className="bg-danger-50 px-3 py-2 rounded-lg"
            onPress={() => handleDelete(item)}
          >
            <Text className="text-danger-600 text-xs font-medium">
              Видалити
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    []
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="mb-3">
          <Text className="text-primary-600 text-sm font-medium">
            ← Назад
          </Text>
        </TouchableOpacity>
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">API ключі</Text>
          <TouchableOpacity
            className="bg-primary-600 px-4 py-2 rounded-xl"
            onPress={() => {
              setNewKey(null);
              setShowModal(true);
            }}
          >
            <Text className="text-white font-semibold text-sm">+ Створити</Text>
          </TouchableOpacity>
        </View>
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
          <Text className="text-sm text-gray-500">
            {(error as Error)?.message}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Text className="text-5xl mb-4">🔗</Text>
              <Text className="text-base font-medium text-gray-500">
                Немає API ключів
              </Text>
              <Text className="text-sm text-gray-400 mt-1">
                Створіть ключ для доступу до API
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">
              {newKey ? "Ключ створено" : "Новий API ключ"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowModal(false);
                setNewKey(null);
              }}
            >
              <Text className="text-primary-600 font-medium">Закрити</Text>
            </TouchableOpacity>
          </View>

          <View className="px-4 mt-4">
            {newKey ? (
              <View className="bg-white rounded-2xl p-4 shadow-sm">
                <Text className="text-sm text-gray-700 mb-2">
                  Збережіть цей ключ. Він більше не буде показаний:
                </Text>
                <View className="bg-gray-50 rounded-lg p-3">
                  <Text className="text-sm font-mono text-gray-900" selectable>
                    {newKey}
                  </Text>
                </View>
                <TouchableOpacity
                  className="bg-primary-600 rounded-xl py-3 items-center mt-4"
                  onPress={() => {
                    setShowModal(false);
                    setNewKey(null);
                  }}
                >
                  <Text className="text-white font-semibold">
                    Зрозуміло
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="bg-white rounded-2xl p-4 shadow-sm">
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Назва ключа
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                    value={keyName}
                    onChangeText={setKeyName}
                    placeholder="Мій API ключ"
                  />
                </View>
                <TouchableOpacity
                  className={`rounded-xl py-4 items-center ${
                    createApiKey.isPending
                      ? "bg-primary-400"
                      : "bg-primary-600"
                  }`}
                  onPress={handleCreate}
                  disabled={createApiKey.isPending}
                >
                  {createApiKey.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold text-base">
                      Створити ключ
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
