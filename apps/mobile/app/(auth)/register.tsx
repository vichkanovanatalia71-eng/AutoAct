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

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Помилка", "Заповніть всі обов'язкові поля");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Помилка", "Паролі не співпадають");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Помилка", "Пароль має містити щонайменше 8 символів");
      return;
    }

    setLoading(true);
    try {
      await register(
        email.trim(),
        password,
        referralCode.trim() || undefined
      );
    } catch (err: any) {
      Alert.alert("Помилка реєстрації", err.message || "Спробуйте ще раз");
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
              Створіть новий акаунт
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
              placeholder="Мінімум 8 символів"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Підтвердіть пароль
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
              placeholder="Повторіть пароль"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Реферальний код (необов'язково)
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
              placeholder="Введіть код"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            className={`rounded-xl py-4 items-center mt-2 ${
              loading ? "bg-primary-400" : "bg-primary-600"
            }`}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Зареєструватися
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-500 text-sm">Вже є акаунт? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-primary-600 font-semibold text-sm">
                  Увійти
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
