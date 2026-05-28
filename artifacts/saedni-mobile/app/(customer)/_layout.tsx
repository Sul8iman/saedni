import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Ionicons, Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";

// RTL tab order: profile (left) | my-requests (center) | index/طلب جديد (right)
// Tabs defined left→right in code appear left→right on screen.
// For Arabic RTL, primary action "طلب جديد" should be on the RIGHT → define it last.

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>حسابي</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my-requests">
        <Icon sf={{ default: "list.bullet", selected: "list.bullet.rectangle.fill" }} />
        <Label>طلباتي</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "plus.circle", selected: "plus.circle.fill" }} />
        <Label>طلب جديد</Label>
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
      {/* Left tab: profile */}
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
      {/* Center tab: my-requests */}
      <Tabs.Screen
        name="my-requests"
        options={{
          title: "طلباتي",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="list.bullet" tintColor={color} size={size} />
            ) : (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
        }}
      />
      {/* Right tab: new request (primary action for RTL) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "طلب جديد",
          tabBarIcon: ({ color, size, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "plus.circle.fill" : "plus.circle"} tintColor={color} size={size} />
            ) : (
              <Ionicons
                name={focused ? "add-circle" : "add-circle-outline"}
                size={size + 2}
                color={color}
              />
            ),
        }}
      />
    </Tabs>
  );
}

export default function CustomerTabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
