import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { router, Tabs } from "expo-router";
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="gallery">
        <Icon sf={{ default: "photo.on.rectangle", selected: "photo.fill.on.rectangle.fill" }} />
        <Label>Gallery</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="snap">
        <Icon src={<VectorIcon family={Feather} name="camera" />} />
        <Label>Snap</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="summary">
        <Icon src={<VectorIcon family={Feather} name="bar-chart-2" />} />
        <Label>Summary</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon src={<VectorIcon family={Feather} name="user" />} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const tabBarHeight = isWeb ? 84 : 60;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.ctaDarkGreen,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 60,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]}
            />
          ) : null,
      }}
      tabBar={({ state, navigation }) => {
        const getRoute = (name: string) => state.routes.find((route) => route.name === name);
        const renderTab = (
          name: string,
          label: string,
          icon: (color: string) => React.ReactNode,
        ) => {
          const route = getRoute(name);
          if (!route) return null;

          const routeIndex = state.routes.indexOf(route);
          const focused = state.index === routeIndex;
          const color = focused ? colors.ctaDarkGreen : colors.mutedForeground;

          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={styles.tabItem}
            >
              {icon(color)}
              <Text style={[styles.tabLabel, { color, fontFamily: "Inter_500Medium" }]}>
                {label}
              </Text>
            </Pressable>
          );
        };

        return (
          <View
            style={[
              styles.customTabBar,
              {
                height: tabBarHeight,
                backgroundColor: isIOS ? "transparent" : colors.card,
                borderTopColor: colors.border,
              },
            ]}
          >
            {isIOS ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : isWeb ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
            ) : null}
            {renderTab("index", "Dashboard", (color) =>
              isIOS ? (
                <SymbolView name="house" tintColor={color} size={24} />
              ) : (
                <Feather name="home" size={22} color={color} />
              ),
            )}
            {renderTab("gallery", "Gallery", (color) =>
              isIOS ? (
                <SymbolView name="photo.on.rectangle" tintColor={color} size={24} />
              ) : (
                <Feather name="image" size={22} color={color} />
              ),
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Snap"
              onPress={() => router.push("/snap")}
              style={styles.snapTabItem}
            >
              <View
                style={[
                  styles.snapTabButton,
                  {
                    backgroundColor: colors.ctaDarkGreen,
                    shadowColor: colors.ctaDarkGreen,
                  },
                ]}
              >
                <Feather name="camera" size={30} color={colors.whiteTextOnGreen} />
              </View>
            </Pressable>
            {renderTab("summary", "Summary", (color) => (
              <Feather name="bar-chart-2" size={22} color={color} />
            ))}
            {renderTab("profile", "Profile", (color) => (
              <Feather name="user" size={22} color={color} />
            ))}
          </View>
        );
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: "Gallery",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="photo.on.rectangle" tintColor={color} size={24} />
            ) : (
              <Feather name="image" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="summary"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push("/weekly-summary");
          },
        }}
        options={{
          title: "Summary",
          tabBarIcon: ({ color }) => (
            <Feather name="bar-chart-2" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  customTabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    elevation: 0,
    overflow: "visible",
  },
  tabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
  },
  snapTabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  snapTabButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -30,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
});
