import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { setBaseUrl } from "@workspace/api-client-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack, useSegments } from "expo-router";
import Head from "expo-router/head";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NutritionProvider } from "@/context/NutritionContext";
import { ProfileProvider } from "@/context/ProfileContext";

if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AppHead() {
  return (
    <Head>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1"
      />
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content="#4A7C59" />
      <link rel="apple-touch-icon" href="/icon-192.png" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <style>{`
        html {
          font-size: 16px;
          box-sizing: border-box;
          max-width: 100%;
          overflow-x: hidden;
        }

        *, *::before, *::after {
          box-sizing: inherit;
        }

        body, #root {
          max-width: 100%;
          overflow-x: hidden;
        }

        button, [role="button"], input, textarea, select {
          touch-action: manipulation;
        }
      `}</style>
    </Head>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "sign-in" || segments[0] === "sign-up";

    if (!session && !inAuthGroup) {
      router.replace("/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
      <Stack.Screen name="snap" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="log-confirm" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="goals" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="meal-detail" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="weekly-summary" options={{ headerShown: false, presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const isWeb = Platform.OS.toString() === "web";
    if (
      !isWeb ||
      process.env.NODE_ENV === "development" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA install should not block the app if service worker registration fails.
    });
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AppHead />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ProfileProvider>
              <NutritionProvider>
                <GestureHandlerRootView style={styles.appRoot}>
                  <KeyboardProvider>
                    <AuthGate>
                      <RootLayoutNav />
                    </AuthGate>
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </NutritionProvider>
            </ProfileProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
});
