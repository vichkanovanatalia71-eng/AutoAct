import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore, useUpdateProfile } from "@autoact/hooks";

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const updateProfile = useUpdateProfile();

  const [email, setEmail] = useState(user?.email || "");
  const [timezone, setTimezone] = useState(user?.timezone || "Europe/Kyiv");
  const [language, setLanguage] = useState(user?.language || "uk");

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      if (user.timezone) setTimezone(user.timezone);
      if (user.language) setLanguage(user.language);
    }
  }, [user]);

  const handleSave = () => {
    updateProfile.mutate(
      { email, timezone, language },
      {
        onSuccess: () => {
          refreshUser();
          Alert.alert("Готово", "Профіль оновлено");
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
          <Text className="text-2xl font-bold text-gray-900">Профіль</Text>
        </View>

        <View className="px-4 mt-4">
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Email
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Часовий пояс
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                value={timezone}
                onChangeText={setTimezone}
                autoCapitalize="none"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Мова
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                value={language}
                onChangeText={setLanguage}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              className={`rounded-xl py-4 items-center ${
                updateProfile.isPending ? "bg-primary-400" : "bg-primary-600"
              }`}
              onPress={handleSave}
              disabled={updateProfile.isPending}
              activeOpacity={0.8}
            >
              {updateProfile.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Зберегти зміни
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
