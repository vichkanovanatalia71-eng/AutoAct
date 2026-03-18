import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="security" />
      <Stack.Screen name="credentials" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="api-keys" />
      <Stack.Screen name="referral" />
      <Stack.Screen name="data" />
    </Stack>
  );
}
