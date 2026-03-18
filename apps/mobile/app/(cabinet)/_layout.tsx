import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { colors } from "@autoact/ui-tokens";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    dashboard: "🏠",
    workflows: "⚡",
    catalog: "🔍",
    billing: "💳",
    settings: "⚙️",
  };

  return (
    <View className="items-center justify-center">
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
        {icons[name] || "📱"}
      </Text>
    </View>
  );
}

export default function CabinetLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: colors.neutral[200],
          borderTopWidth: 1,
          paddingTop: 4,
          height: 84,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Головна",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="dashboard" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="workflows"
        options={{
          title: "Воркфлоу",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="workflows" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: "Каталог",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="catalog" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: "Білінг",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="billing" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Налашт.",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
