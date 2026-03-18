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
  useCredentials,
  useCreateCredential,
  useDeleteCredential,
} from "@autoact/hooks";
import type { CredentialDTO } from "@autoact/types";

export default function CredentialsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useCredentials();
  const createCredential = useCreateCredential();
  const deleteCredential = useDeleteCredential();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [apiKey, setApiKey] = useState("");

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCreate = () => {
    if (!name.trim() || !serviceType.trim() || !apiKey.trim()) {
      Alert.alert("Помилка", "Заповніть всі поля");
      return;
    }

    createCredential.mutate(
      {
        name: name.trim(),
        serviceType: serviceType.trim(),
        data: { apiKey: apiKey.trim() },
      },
      {
        onSuccess: () => {
          Alert.alert("Готово", "Облікові дані додано");
          setShowModal(false);
          setName("");
          setServiceType("");
          setApiKey("");
        },
        onError: (err: any) => {
          Alert.alert("Помилка", err.message || "Спробуйте ще раз");
        },
      }
    );
  };

  const handleDelete = (cred: CredentialDTO) => {
    Alert.alert(
      "Видалити?",
      `Видалити облікові дані "${cred.name}"?`,
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити",
          style: "destructive",
          onPress: () => deleteCredential.mutate(cred.id),
        },
      ]
    );
  };

  const renderItem = useCallback(
    ({ item }: { item: CredentialDTO }) => (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-base font-semibold text-gray-900">
              {item.name}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              {item.serviceType}
            </Text>
            <Text className="text-xs text-gray-400 mt-1">
              Додано: {new Date(item.createdAt).toLocaleDateString("uk-UA")}
            </Text>
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
          <Text className="text-2xl font-bold text-gray-900">
            Облікові дані
          </Text>
          <TouchableOpacity
            className="bg-primary-600 px-4 py-2 rounded-xl"
            onPress={() => setShowModal(true)}
          >
            <Text className="text-white font-semibold text-sm">+ Додати</Text>
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
              <Text className="text-5xl mb-4">🔑</Text>
              <Text className="text-base font-medium text-gray-500">
                Немає облікових даних
              </Text>
              <Text className="text-sm text-gray-400 mt-1">
                Додайте API ключі ваших сервісів
              </Text>
            </View>
          }
        />
      )}

      {/* Add Credential Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">
              Нові облікові дані
            </Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text className="text-primary-600 font-medium">Скасувати</Text>
            </TouchableOpacity>
          </View>

          <View className="px-4 mt-4">
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Назва
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                  value={name}
                  onChangeText={setName}
                  placeholder="Мої Google Sheets"
                />
              </View>
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Тип сервісу
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                  value={serviceType}
                  onChangeText={setServiceType}
                  placeholder="google_sheets"
                  autoCapitalize="none"
                />
              </View>
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  API ключ
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="sk-..."
                  autoCapitalize="none"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                className={`rounded-xl py-4 items-center ${
                  createCredential.isPending
                    ? "bg-primary-400"
                    : "bg-primary-600"
                }`}
                onPress={handleCreate}
                disabled={createCredential.isPending}
              >
                {createCredential.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Додати
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
