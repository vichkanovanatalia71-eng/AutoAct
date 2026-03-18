import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useExportAccount, useDeleteAccount, useAuthStore } from "@autoact/hooks";

export default function DataScreen() {
  const router = useRouter();
  const exportAccount = useExportAccount();
  const deleteAccount = useDeleteAccount();
  const logout = useAuthStore((s) => s.logout);

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleExport = () => {
    exportAccount.mutate(undefined, {
      onSuccess: () => {
        Alert.alert(
          "Готово",
          "Запит на експорт даних отримано. Ви отримаєте email з посиланням на завантаження."
        );
      },
      onError: (err: any) => {
        Alert.alert("Помилка", err.message || "Спробуйте ще раз");
      },
    });
  };

  const handleDelete = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    Alert.alert(
      "УВАГА! Видалити акаунт?",
      "Ця дія незворотна. Всі ваші дані, воркфлоу та облікові дані будуть видалені назавжди.",
      [
        {
          text: "Скасувати",
          style: "cancel",
          onPress: () => setDeleteConfirm(false),
        },
        {
          text: "Видалити назавжди",
          style: "destructive",
          onPress: () => {
            deleteAccount.mutate(undefined, {
              onSuccess: () => {
                Alert.alert("Акаунт видалено", "Ваш акаунт було видалено.");
                logout();
              },
              onError: (err: any) => {
                Alert.alert("Помилка", err.message || "Спробуйте ще раз");
                setDeleteConfirm(false);
              },
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <View className="px-4 pt-4 pb-2">
          <TouchableOpacity onPress={() => router.back()} className="mb-3">
            <Text className="text-primary-600 text-sm font-medium">
              ← Назад
            </Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">
            Дані та конфіденційність
          </Text>
        </View>

        {/* Export */}
        <View className="px-4 mt-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Експорт даних
          </Text>
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-sm text-gray-600 mb-4 leading-5">
              Ви маєте право отримати копію ваших персональних даних відповідно до
              GDPR. Після запиту ви отримаєте email з посиланням для
              завантаження.
            </Text>
            <TouchableOpacity
              className={`rounded-xl py-3 items-center ${
                exportAccount.isPending ? "bg-primary-400" : "bg-primary-100"
              }`}
              onPress={handleExport}
              disabled={exportAccount.isPending}
            >
              {exportAccount.isPending ? (
                <ActivityIndicator color="#4F46E5" />
              ) : (
                <Text className="text-primary-700 font-semibold text-sm">
                  Запросити експорт даних
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Delete Account */}
        <View className="px-4 mt-6">
          <Text className="text-base font-semibold text-danger-600 mb-3">
            Небезпечна зона
          </Text>
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-danger-200">
            <Text className="text-sm text-gray-600 mb-2 leading-5">
              Видалення акаунту призведе до повного та незворотного видалення
              всіх ваших даних:
            </Text>
            <View className="ml-2 mb-4">
              <Text className="text-sm text-gray-600">
                - Усі воркфлоу та історія виконань
              </Text>
              <Text className="text-sm text-gray-600">
                - Облікові дані та API ключі
              </Text>
              <Text className="text-sm text-gray-600">
                - Дані профілю та налаштування
              </Text>
              <Text className="text-sm text-gray-600">
                - Історія платежів та підписки
              </Text>
            </View>

            {deleteConfirm && (
              <View className="bg-danger-50 rounded-lg p-3 mb-4">
                <Text className="text-sm text-danger-700 font-medium">
                  Ви впевнені? Натисніть кнопку ще раз для підтвердження.
                </Text>
              </View>
            )}

            <TouchableOpacity
              className={`rounded-xl py-3 items-center ${
                deleteAccount.isPending
                  ? "bg-danger-300"
                  : deleteConfirm
                  ? "bg-danger-600"
                  : "bg-danger-100"
              }`}
              onPress={handleDelete}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  className={`font-semibold text-sm ${
                    deleteConfirm ? "text-white" : "text-danger-700"
                  }`}
                >
                  {deleteConfirm
                    ? "Підтвердити видалення"
                    : "Видалити акаунт"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
