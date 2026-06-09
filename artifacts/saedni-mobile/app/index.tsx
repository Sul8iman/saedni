import { Redirect } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

const BUILD_STAMP = "BUILD 6 · d9443ec";

export default function Index() {
  const { user, loading } = useAuth();
  const colors = useColors();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, gap: 12 }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "monospace" }}>
          {BUILD_STAMP}
        </Text>
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (user.userType === "admin") return <Redirect href="/(admin)" />;
  if (user.userType === "customer") return <Redirect href="/(customer)" />;
  return <Redirect href="/(helper)" />;
}
