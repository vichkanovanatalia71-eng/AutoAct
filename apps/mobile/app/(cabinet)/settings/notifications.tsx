import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useUpdateNotificationPrefs } from "@autoact/hooks";

export default function NotificationsScreen() {
  const router = useRouter();
  const updatePrefs = useUpdateNotificationPrefs();

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [pushErrors, setPushErrors] = useState(true);
  const [pushActions, setPushActions] = useState(true);
  const [pushExecutions, setPushExecutions] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);

  const handleSave = () => {
    updatePrefs.mutate(
      {
        email: emailNotifs,
        inApp: inAppNotifs,
        pushErrors,
        pushActions,
        pushExecutions,
        weeklyReport,
      },
      {
        onSuccess: () => {
          Alert.alert("Готово", "Налаштування сповіщень оновлено");
        },
        onError: (err: any) => {
          Alert.alert("Помилка", err.message || "Спробуйте ще раз");
        },
      }
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
            Сповіщення
          </Text>
        </View>

        <View className="px-4 mt-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Канали
          </Text>
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View>
                <Text className="text-sm text-gray-900 font-medium">
                  Email сповіщення
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  Отримувати на пошту
                </Text>
              </View>
              <Switch
                value={emailNotifs}
                onValueChange={setEmailNotifs}
                trackColor={{ false: "#D1D5DB", true: "#818CF8" }}
                thumbColor={emailNotifs ? "#6366F1" : "#f4f3f4"}
              />
            </View>
            <View className="flex-row items-center justify-between py-3">
              <View>
                <Text className="text-sm text-gray-900 font-medium">
                  В додатку
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  Сповіщення всередині додатку
                </Text>
              </View>
              <Switch
                value={inAppNotifs}
                onValueChange={setInAppNotifs}
                trackColor={{ false: "#D1D5DB", true: "#818CF8" }}
                thumbColor={inAppNotifs ? "#6366F1" : "#f4f3f4"}
              />
            </View>
          </View>
        </View>

        <View className="px-4 mt-6">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Push-сповіщення
          </Text>
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View>
                <Text className="text-sm text-gray-900 font-medium">
                  Помилки
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  Сповіщати про помилки виконання
                </Text>
              </View>
              <Switch
                value={pushErrors}
                onValueChange={setPushErrors}
                trackColor={{ false: "#D1D5DB", true: "#818CF8" }}
                thumbColor={pushErrors ? "#6366F1" : "#f4f3f4"}
              />
            </View>
            <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
              <View>
                <Text className="text-sm text-gray-900 font-medium">
                  Дії
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  Зміни статусу воркфлоу
                </Text>
              </View>
              <Switch
                value={pushActions}
                onValueChange={setPushActions}
                trackColor={{ false: "#D1D5DB", true: "#818CF8" }}
                thumbColor={pushActions ? "#6366F1" : "#f4f3f4"}
              />
            </View>
            <View className="flex-row items-center justify-between py-3">
              <View>
                <Text className="text-sm text-gray-900 font-medium">
                  Виконання
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  Кожне успішне виконання
                </Text>
              </View>
              <Switch
                value={pushExecutions}
                onValueChange={setPushExecutions}
                trackColor={{ false: "#D1D5DB", true: "#818CF8" }}
                thumbColor={pushExecutions ? "#6366F1" : "#f4f3f4"}
              />
            </View>
          </View>
        </View>

        <View className="px-4 mt-6">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Звіти
          </Text>
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between py-3">
              <View>
                <Text className="text-sm text-gray-900 font-medium">
                  Тижневий звіт
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  Підсумки за тиждень на email
                </Text>
              </View>
              <Switch
                value={weeklyReport}
                onValueChange={setWeeklyReport}
                trackColor={{ false: "#D1D5DB", true: "#818CF8" }}
                thumbColor={weeklyReport ? "#6366F1" : "#f4f3f4"}
              />
            </View>
          </View>
        </View>

        <View className="px-4 mt-6">
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${
              updatePrefs.isPending ? "bg-primary-400" : "bg-primary-600"
            }`}
            onPress={handleSave}
            disabled={updatePrefs.isPending}
          >
            {updatePrefs.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Зберегти
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
