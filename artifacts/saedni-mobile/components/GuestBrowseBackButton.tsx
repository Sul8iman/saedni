import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export default function GuestBrowseBackButton() {
  const colors = useColors();
  const router = useRouter();

  return (
    <TouchableOpacity
      testID="auth-return-to-guest"
      accessibilityRole="button"
      accessibilityLabel="العودة إلى الطلبات المتاحة"
      onPress={() => router.dismissTo("/(guest)")}
      activeOpacity={0.75}
      style={styles.button}
    >
      <Ionicons name="close" size={20} color={colors.primary} />
      <Text style={[styles.label, { color: colors.primary }]}>العودة للتصفح</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-end",
    minHeight: 44,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  label: { fontSize: 14, fontWeight: "700" },
});
