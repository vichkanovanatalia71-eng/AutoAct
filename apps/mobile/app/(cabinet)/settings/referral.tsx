import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useReferral } from "@autoact/hooks";

export default function ReferralScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useReferral();

  const handleShare = async () => {
    if (!data?.code) return;
    try {
      await Share.share({
        message: `Приєднуйтесь до AutoAct! Використайте мій реферальний код: ${data.code}\nhttps://autoact.app/register?ref=${data.code}`,
      });
    } catch {
      // user cancelled
    }
  };

  const handleCopy = async () => {
    if (data?.code) {
      await Clipboard.setStringAsync(data.code);
      Alert.alert("Скопійовано", `Код: ${data.code}`);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-5xl mb-4">⚠️</Text>
        <Text className="text-base font-semibold text-gray-900 mb-2">
          Помилка
        </Text>
        <Text className="text-sm text-gray-500">
          {(error as Error)?.message}
        </Text>
      </SafeAreaView>
    );
  }

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
            Реферальна програма
          </Text>
        </View>

        <View className="px-4 mt-4">
          <View className="bg-primary-50 rounded-2xl p-5 border border-primary-200">
            <Text className="text-lg font-bold text-primary-900 mb-2">
              Запрошуйте друзів
            </Text>
            <Text className="text-sm text-primary-700 leading-5">
              Поділіться вашим реферальним кодом з друзями. Ви обоє отримаєте
              бонуси після їх реєстрації.
            </Text>
          </View>
        </View>

        {data?.code && (
          <View className="px-4 mt-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Ваш код
            </Text>
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <TouchableOpacity
                className="bg-gray-50 rounded-xl p-4 items-center"
                onPress={handleCopy}
                activeOpacity={0.7}
              >
                <Text className="text-2xl font-bold text-primary-600 tracking-widest">
                  {data.code}
                </Text>
                <Text className="text-xs text-gray-500 mt-2">
                  Натисніть щоб скопіювати
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-primary-600 rounded-xl py-4 items-center mt-4"
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-base">
                  Поділитися
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {data?.referrals && data.referrals.length > 0 && (
          <View className="px-4 mt-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              Запрошені ({data.referrals.length})
            </Text>
            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {data.referrals.map((ref, idx) => (
                <View
                  key={ref.id}
                  className={`px-4 py-3 flex-row items-center justify-between ${
                    idx < data.referrals.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View>
                    <Text className="text-sm text-gray-700">
                      Реферал #{idx + 1}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-0.5">
                      {new Date(ref.createdAt).toLocaleDateString("uk-UA")}
                    </Text>
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${
                      ref.rewardGranted ? "bg-success-50" : "bg-warning-50"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        ref.rewardGranted
                          ? "text-success-700"
                          : "text-warning-700"
                      }`}
                    >
                      {ref.rewardGranted ? "Нараховано" : "Очікує"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {data?.referrals?.length === 0 && (
          <View className="px-4 mt-6 items-center">
            <Text className="text-sm text-gray-400">
              Ще немає запрошених користувачів
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
