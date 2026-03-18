import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { configureApiClient, useAuthStore } from "@autoact/hooks";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Constants from "expo-constants";
import "../global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

const API_BASE =
  Constants.expoConfig?.extra?.apiUrl ?? "https://api.autoact.app";

configureApiClient({
  baseUrl: API_BASE,
  getToken: () => SecureStore.getItemAsync("auth_token"),
  setToken: async (token) => {
    if (token) {
      await SecureStore.setItemAsync("auth_token", token);
    } else {
      await SecureStore.deleteItemAsync("auth_token");
    }
  },
  onUnauthorized: () => {
    useAuthStore.getState().setUser(null);
  },
});

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading, refreshUser, setLoading } = useAuthStore();

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("auth_token");
      if (token) {
        await refreshUser();
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === "(auth)";

    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && inAuth) {
      router.replace("/(cabinet)/dashboard");
    }
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthGate />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(cabinet)" />
        </Stack>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
