import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const TERMS = [
  {
    title: "طبيعة المنصة",
    body: "ساعدني منصة لربط طالب المساعدة بالمساعد فقط. المنصة لا تُعدّ طرفاً في أي اتفاق أو عقد يتم بين المستخدمين.",
  },
  {
    title: "مسؤولية المستخدم",
    body: "يتحمل المستخدم كامل المسؤولية عن أي تواصل أو اتفاق يتم خارج التطبيق. المنصة لا تراقب ولا تُوثّق أي تعاملات تجرى خارج نطاقها.",
  },
  {
    title: "إخلاء مسؤولية ساعدني",
    body: "ساعدني لا تتحمل مسؤولية عمليات النصب أو الاحتيال أو الخلافات أو المدفوعات التي تتم خارج التطبيق. يُنصح دائماً بالتحقق من هوية الطرف الآخر قبل أي التزام مالي.",
  },
  {
    title: "الحذر المالي",
    body: "على المستخدم الحذر قبل تحويل أي مبالغ مالية أو مشاركة معلومات شخصية أو بنكية مع أي طرف آخر عبر المنصة أو خارجها.",
  },
  {
    title: "صلاحيات الإدارة",
    body: "الإدارة لها الحق في تعطيل أو حذف أي حساب مخالف لشروط الاستخدام أو يُستخدم بطريقة تضر بالمجتمع أو بالمستخدمين الآخرين.",
  },
];

export default function TermsScreen() {
  const colors = useColors();
  const router = useRouter();
  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-forward" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>الشروط والأحكام</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.introBanner}>
          <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
          <Text style={s.introText}>
            يرجى قراءة الشروط والأحكام التالية بعناية قبل استخدام تطبيق ساعدني.
          </Text>
        </View>

        {TERMS.map((t, i) => (
          <View key={i} style={s.termCard}>
            <View style={s.termHeader}>
              <View style={s.termNumber}>
                <Text style={s.termNumberTxt}>{i + 1}</Text>
              </View>
              <Text style={s.termTitle}>{t.title}</Text>
            </View>
            <Text style={s.termBody}>{t.body}</Text>
          </View>
        ))}

        <View style={s.footer}>
          <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
          <Text style={s.footerTxt}>
            باستخدامك للتطبيق فإنك توافق على هذه الشروط والأحكام وسياسة الخصوصية.
          </Text>
        </View>

        <TouchableOpacity style={s.acceptBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={s.acceptBtnTxt}>فهمت وأوافق</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: "row-reverse", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.border,
      backgroundColor: c.card,
    },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: c.foreground, textAlign: "center" },
    headerSpacer: { width: 32 },
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    introBanner: {
      backgroundColor: c.secondary, borderRadius: 14, padding: 16,
      flexDirection: "row-reverse", alignItems: "flex-start", gap: 12, marginBottom: 20,
    },
    introText: { flex: 1, fontSize: 14, color: c.secondaryForeground, textAlign: "right", lineHeight: 22 },
    termCard: {
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border,
      padding: 16, marginBottom: 12,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    termHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 10 },
    termNumber: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: c.primary, alignItems: "center", justifyContent: "center",
    },
    termNumberTxt: { color: c.primaryForeground, fontSize: 13, fontWeight: "800" },
    termTitle: { fontSize: 15, fontWeight: "700", color: c.foreground, flex: 1, textAlign: "right" },
    termBody: { fontSize: 14, color: c.mutedForeground, textAlign: "right", lineHeight: 22 },
    footer: {
      flexDirection: "row-reverse", alignItems: "flex-start", gap: 8,
      marginTop: 8, marginBottom: 20,
    },
    footerTxt: { flex: 1, fontSize: 12, color: c.mutedForeground, textAlign: "right", lineHeight: 18 },
    acceptBtn: {
      backgroundColor: c.primary, borderRadius: 12,
      paddingVertical: 15, alignItems: "center",
    },
    acceptBtnTxt: { color: c.primaryForeground, fontSize: 16, fontWeight: "700", textAlign: "right" },
  });
