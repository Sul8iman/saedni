import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { user, loading } = useAuth();
  const colors = useColors();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.userType === "admin") return <Redirect href="/(admin)" />;
  if (user.userType === "customer") return <Redirect href="/(customer)" />;
  return <Redirect href="/(helper)" />;
}
