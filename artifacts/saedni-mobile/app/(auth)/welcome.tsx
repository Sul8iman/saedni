import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function WelcomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.container}>

        {/* Hero section */}
        <View style={s.hero}>
          <View style={s.logoCircle}>
            <Ionicons name="hand-left" size={48} color={colors.primaryForeground} />
          </View>
          <Text style={s.appName}>ساعدني</Text>
          <Text style={s.tagline}>منصة المساعدة اليومية في عُمان</Text>
          <Text style={s.desc}>
            انشر طلبك أو ساعد غيرك — أسرع طريقة للحصول على المساعدة في منطقتك
          </Text>
        </View>

        {/* Feature chips */}
        <View style={s.chips}>
          <View style={s.chip}>
            <Ionicons name="flash-outline" size={16} color={colors.primary} />
            <Text style={s.chipTxt}>سريع وسهل</Text>
          </View>
          <View style={s.chip}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={s.chipTxt}>في منطقتك</Text>
          </View>
          <View style={s.chip}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
            <Text style={s.chipTxt}>موثوق</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={s.actions}>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnTxt}>تسجيل الدخول</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={() => router.push("/(auth)/register")}
            activeOpacity={0.85}
          >
            <Text style={s.secondaryBtnTxt}>إنشاء حساب جديد</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    container: {
      flex: 1, paddingHorizontal: 24,
      justifyContent: "space-between", paddingTop: 48, paddingBottom: 32,
    },
    hero: { alignItems: "center", gap: 12 },
    logoCircle: {
      width: 100, height: 100, borderRadius: 50,
      backgroundColor: c.primary, alignItems: "center", justifyContent: "center",
      marginBottom: 8,
      shadowColor: c.primary, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
    },
    appName: {
      fontSize: 40, fontWeight: "800", color: c.foreground,
      letterSpacing: -1, textAlign: "center",
    },
    tagline: {
      fontSize: 16, color: c.primary, fontWeight: "600",
      textAlign: "center",
    },
    desc: {
      fontSize: 14, color: c.mutedForeground, textAlign: "center",
      lineHeight: 22, marginTop: 4, maxWidth: 300,
    },
    chips: {
      flexDirection: "row-reverse", justifyContent: "center",
      gap: 10, flexWrap: "wrap",
    },
    chip: {
      flexDirection: "row-reverse", alignItems: "center", gap: 6,
      backgroundColor: c.secondary, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 8,
      borderWidth: 1, borderColor: c.border,
    },
    chipTxt: { fontSize: 13, color: c.foreground, fontWeight: "600" },
    actions: { gap: 12 },
    primaryBtn: {
      backgroundColor: c.primary, borderRadius: 14,
      paddingVertical: 17, alignItems: "center",
      shadowColor: c.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
    },
    primaryBtnTxt: { color: c.primaryForeground, fontSize: 17, fontWeight: "700" },
    secondaryBtn: {
      backgroundColor: c.card, borderRadius: 14,
      paddingVertical: 17, alignItems: "center",
      borderWidth: 1.5, borderColor: c.border,
    },
    secondaryBtnTxt: { color: c.foreground, fontSize: 17, fontWeight: "600" },
  });
