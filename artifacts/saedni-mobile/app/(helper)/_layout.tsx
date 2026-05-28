import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";

// RTL tab order: profile (left) | my-requests/مهامي (center) | index/الطلبات (right/primary)

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>حسابي</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my-requests">
        <Icon sf={{ default: "briefcase", selected: "briefcase.fill" }} />
        <Label>مهامي</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "magnifyingglass", selected: "magnifyingglass.circle.fill" }} />
        <Label>الطلبات</Label>
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: isIOS ? 0 : 4 },
      }}
    >
      {/* Left: profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "حسابي",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={size} />
            ) : (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
        }}
      />
      {/* Center: my jobs */}
      <Tabs.Screen
        name="my-requests"
        options={{
          title: "مهامي",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="briefcase" tintColor={color} size={size} />
            ) : (
              <Ionicons name="briefcase-outline" size={size} color={color} />
            ),
        }}
      />
      {/* Right/primary: available requests */}
      <Tabs.Screen
        name="index"
        options={{
          title: "الطلبات",
          tabBarIcon: ({ color, size, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "magnifyingglass.circle.fill" : "magnifyingglass"} tintColor={color} size={size} />
            ) : (
              <Ionicons
                name={focused ? "search-circle" : "search-outline"}
                size={focused ? size + 4 : size}
                color={color}
              />
            ),
        }}
      />
    </Tabs>
  );
}

export default function HelperTabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
