import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "@autoact/hooks";

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: "Профіль",
    icon: "👤",
    route: "/(cabinet)/settings/profile",
    description: "Email, часовий пояс, мова",
  },
  {
    label: "Безпека",
    icon: "🔒",
    route: "/(cabinet)/settings/security",
    description: "Пароль, 2FA, біометрія",
  },
  {
    label: "Облікові дані",
    icon: "🔑",
    route: "/(cabinet)/settings/credentials",
    description: "API ключі сервісів",
  },
  {
    label: "Сповіщення",
    icon: "🔔",
    route: "/(cabinet)/settings/notifications",
    description: "Налаштування сповіщень",
  },
  {
    label: "API ключі",
    icon: "🔗",
    route: "/(cabinet)/settings/api-keys",
    description: "Ключі доступу до API",
  },
  {
    label: "Реферальна програма",
    icon: "🎁",
    route: "/(cabinet)/settings/referral",
    description: "Запрошуйте друзів",
  },
  {
    label: "Дані",
    icon: "💾",
    route: "/(cabinet)/settings/data",
    description: "Експорт та видалення",
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Вийти з акаунту?", "Ви впевнені, що хочете вийти?", [
      { text: "Скасувати", style: "cancel" },
      {
        text: "Вийти",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-gray-900">
            Налаштування
          </Text>
          {user && (
            <Text className="text-sm text-gray-500 mt-1">{user.email}</Text>
          )}
        </View>

        <View className="px-4 mt-4">
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={item.route}
              className={`bg-white flex-row items-center p-4 ${
                idx === 0 ? "rounded-t-2xl" : ""
              } ${
                idx === MENU_ITEMS.length - 1
                  ? "rounded-b-2xl"
                  : "border-b border-gray-100"
              }`}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Text className="text-2xl mr-4">{item.icon}</Text>
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900">
                  {item.label}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {item.description}
                </Text>
              </View>
              <Text className="text-gray-400 text-lg">›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="px-4 mt-6">
          <TouchableOpacity
            className="bg-white rounded-2xl py-4 items-center border border-danger-200"
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text className="text-danger-600 font-semibold text-base">
              Вийти з акаунту
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-xs text-gray-400 text-center mt-6">
          AutoAct v0.1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
