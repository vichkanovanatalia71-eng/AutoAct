import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import {
  useAuthStore,
  useUpdatePassword,
  useSetup2FA,
  useVerify2FA,
  useDisable2FA,
} from "@autoact/hooks";

export default function SecurityScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  const [biometricEnabled, setBiometricEnabled] = useState(
    user?.biometricEnabled || false
  );

  const updatePassword = useUpdatePassword();
  const setup2FA = useSetup2FA();
  const verify2FA = useVerify2FA();
  const disable2FA = useDisable2FA();

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Помилка", "Заповніть всі поля");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Помилка", "Нові паролі не співпадають");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Помилка", "Новий пароль має містити щонайменше 8 символів");
      return;
    }

    updatePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          Alert.alert("Готово", "Пароль змінено");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err: any) => {
          Alert.alert("Помилка", err.message || "Невірний поточний пароль");
        },
      }
    );
  };

  const handleSetup2FA = () => {
    setup2FA.mutate(undefined, {
      onSuccess: (data) => {
        setQrUrl(data.qrCodeUrl);
        setShowSetup2FA(true);
      },
      onError: (err: any) => {
        Alert.alert("Помилка", err.message);
      },
    });
  };

  const handleVerify2FA = () => {
    if (!twoFactorCode.trim()) {
      Alert.alert("Помилка", "Введіть код");
      return;
    }
    verify2FA.mutate(twoFactorCode.trim(), {
      onSuccess: () => {
        Alert.alert("Готово", "Двофакторну автентифікацію увімкнено");
        setShowSetup2FA(false);
        setTwoFactorCode("");
      },
      onError: (err: any) => {
        Alert.alert("Помилка", err.message || "Невірний код");
      },
    });
  };

  const handleDisable2FA = () => {
    Alert.prompt
      ? Alert.alert(
          "Вимкнути 2FA?",
          "Введіть код з автентифікатора для підтвердження",
          [
            { text: "Скасувати", style: "cancel" },
            {
              text: "Вимкнути",
              style: "destructive",
              onPress: () => {
                if (twoFactorCode.trim()) {
                  disable2FA.mutate(twoFactorCode.trim(), {
                    onSuccess: () => {
                      Alert.alert("Готово", "2FA вимкнено");
                      setTwoFactorCode("");
                    },
                    onError: (err: any) => {
                      Alert.alert("Помилка", err.message);
                    },
                  });
                }
              },
            },
          ]
        )
      : Alert.alert("Вимкнути 2FA", "Введіть код у поле нижче та натисніть ще раз");
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Підтвердіть біометрію",
        cancelLabel: "Скасувати",
      });
      if (result.success) {
        setBiometricEnabled(true);
        Alert.alert("Готово", "Біометричний вхід увімкнено");
      }
    } else {
      setBiometricEnabled(false);
      Alert.alert("Готово", "Біометричний вхід вимкнено");
    }
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
          <Text className="text-2xl font-bold text-gray-900">Безпека</Text>
        </View>

        {/* Change Password */}
        <View className="px-4 mt-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Змінити пароль
          </Text>
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="mb-3">
              <Text className="text-sm text-gray-700 mb-1">
                Поточний пароль
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Введіть поточний пароль"
              />
            </View>
            <View className="mb-3">
              <Text className="text-sm text-gray-700 mb-1">Новий пароль</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Мінімум 8 символів"
              />
            </View>
            <View className="mb-4">
              <Text className="text-sm text-gray-700 mb-1">
                Підтвердіть пароль
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Повторіть новий пароль"
              />
            </View>
            <TouchableOpacity
              className={`rounded-xl py-3 items-center ${
                updatePassword.isPending ? "bg-primary-400" : "bg-primary-600"
              }`}
              onPress={handleChangePassword}
              disabled={updatePassword.isPending}
            >
              {updatePassword.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-sm">
                  Змінити пароль
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 2FA */}
        <View className="px-4 mt-6">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Двофакторна автентифікація
          </Text>
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm text-gray-700">Статус</Text>
              <Text
                className={`text-sm font-semibold ${
                  user?.twoFactorEnabled
                    ? "text-success-600"
                    : "text-gray-400"
                }`}
              >
                {user?.twoFactorEnabled ? "Увімкнено" : "Вимкнено"}
              </Text>
            </View>

            {!user?.twoFactorEnabled && !showSetup2FA && (
              <TouchableOpacity
                className="bg-primary-100 rounded-xl py-3 items-center"
                onPress={handleSetup2FA}
                disabled={setup2FA.isPending}
              >
                {setup2FA.isPending ? (
                  <ActivityIndicator color="#4F46E5" />
                ) : (
                  <Text className="text-primary-700 font-semibold text-sm">
                    Увімкнути 2FA
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {showSetup2FA && (
              <View className="mt-3">
                <Text className="text-sm text-gray-600 mb-2">
                  Скануйте QR-код в автентифікаторі та введіть код:
                </Text>
                {qrUrl && (
                  <Text
                    className="text-xs text-primary-600 mb-3"
                    numberOfLines={3}
                  >
                    {qrUrl}
                  </Text>
                )}
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50 mb-3"
                  value={twoFactorCode}
                  onChangeText={setTwoFactorCode}
                  placeholder="Код з автентифікатора"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity
                  className="bg-primary-600 rounded-xl py-3 items-center"
                  onPress={handleVerify2FA}
                  disabled={verify2FA.isPending}
                >
                  {verify2FA.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold text-sm">
                      Підтвердити
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {user?.twoFactorEnabled && (
              <View className="mt-3">
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50 mb-3"
                  value={twoFactorCode}
                  onChangeText={setTwoFactorCode}
                  placeholder="Код для вимкнення 2FA"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity
                  className="bg-danger-100 rounded-xl py-3 items-center"
                  onPress={handleDisable2FA}
                  disabled={disable2FA.isPending}
                >
                  {disable2FA.isPending ? (
                    <ActivityIndicator color="#DC2626" />
                  ) : (
                    <Text className="text-danger-700 font-semibold text-sm">
                      Вимкнути 2FA
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Biometric */}
        <View className="px-4 mt-6">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Біометрія
          </Text>
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-sm text-gray-700 font-medium">
                  Біометричний вхід
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  Face ID / відбиток пальця
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: "#D1D5DB", true: "#818CF8" }}
                thumbColor={biometricEnabled ? "#6366F1" : "#f4f3f4"}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
