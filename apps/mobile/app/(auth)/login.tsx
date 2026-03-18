import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@autoact/hooks";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Помилка", "Введіть email та пароль");
      return;
    }
    if (needs2FA && !twoFactorCode.trim()) {
      Alert.alert("Помилка", "Введіть код двофакторної автентифікації");
      return;
    }

    setLoading(true);
    try {
      const result = await login(
        email.trim(),
        password,
        needs2FA ? twoFactorCode.trim() : undefined
      );
      if (result.twoFactorRequired) {
        setNeeds2FA(true);
      }
    } catch (err: any) {
      Alert.alert("Помилка входу", err.message || "Невірні облікові дані");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
          className="px-6"
        >
          <View className="items-center mb-10">
            <Text className="text-4xl font-extrabold text-primary-600">
              AutoAct
            </Text>
            <Text className="text-base text-gray-500 mt-2">
              Увійдіть у свій акаунт
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Email
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Пароль
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
              placeholder="Введіть пароль"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              editable={!loading}
            />
          </View>

          {needs2FA && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Код 2FA
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                placeholder="123456"
                value={twoFactorCode}
                onChangeText={setTwoFactorCode}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
            </View>
          )}

          <TouchableOpacity
            className={`rounded-xl py-4 items-center mt-2 ${
              loading ? "bg-primary-400" : "bg-primary-600"
            }`}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Увійти
              </Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity className="mt-4 items-center">
              <Text className="text-primary-600 text-sm">
                Забули пароль?
              </Text>
            </TouchableOpacity>
          </Link>

          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-500 text-sm">Немає акаунту? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text className="text-primary-600 font-semibold text-sm">
                  Зареєструватися
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
