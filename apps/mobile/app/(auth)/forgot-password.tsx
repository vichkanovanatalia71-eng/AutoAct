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
import { apiFetch } from "@autoact/hooks";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert("Помилка", "Введіть email");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch (err: any) {
      Alert.alert("Помилка", err.message || "Спробуйте ще раз");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          className="px-6"
        >
          <View className="items-center">
            <Text className="text-6xl mb-4">📧</Text>
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Перевірте пошту
            </Text>
            <Text className="text-base text-gray-500 text-center mb-8">
              Ми надіслали інструкції для скидання пароля на {email}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity className="bg-primary-600 rounded-xl py-4 px-8">
                <Text className="text-white font-semibold text-base">
                  Повернутися до входу
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
              Відновлення пароля
            </Text>
          </View>

          <Text className="text-sm text-gray-500 mb-6 text-center">
            Введіть email, пов'язаний з вашим акаунтом, і ми надішлемо
            інструкції для скидання пароля.
          </Text>

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

          <TouchableOpacity
            className={`rounded-xl py-4 items-center mt-2 ${
              loading ? "bg-primary-400" : "bg-primary-600"
            }`}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Надіслати інструкції
              </Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity className="mt-6 items-center">
              <Text className="text-primary-600 text-sm">
                Повернутися до входу
              </Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
