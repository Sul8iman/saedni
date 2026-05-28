import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal, FlatList, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, AREAS } from "@/constants/categories";
import type { CategoryValue } from "@/constants/categories";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

export default function CustomerHomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isBlocked = user?.isBlocked || user?.isActive === false;

  const [category, setCategory] = useState<CategoryValue | "">("");
  const [details, setDetails] = useState("");
  const [timeType, setTimeType] = useState<"now" | "scheduled">("now");
  const [area, setArea] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [areaPickerVisible, setAreaPickerVisible] = useState(false);

  const top = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = Platform.OS === "web" ? 84 : 80;

  async function handleSubmit() {
    if (!category || !details || !area || !amount) {
      Alert.alert("تنبيه", "يرجى تعبئة جميع الحقول");
      return;
    }
    if (!user) return;
    if (isBlocked) {
      Alert.alert("تعطيل الحساب", "تم تعطيل حسابك. يرجى التواصل مع الإدارة");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${BASE}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerId: user.id,
          category,
          details,
          timeType,
          area,
          offeredAmount: parseFloat(amount),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        Alert.alert("خطأ", d.error || "فشل نشر الطلب");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
      setCategory("");
      setDetails("");
      setArea("");
      setAmount("");
      setTimeType("now");
    } catch {
      Alert.alert("خطأ", "تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  const s = makeStyles(colors, top, tabBarHeight, insets.bottom);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>ساعدني</Text>
        <Text style={s.headerSub}>ماذا تحتاج اليوم؟</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isBlocked && (
          <View style={s.blockedBanner}>
            <Ionicons name="shield-off" size={20} color="#DC2626" />
            <Text style={s.blockedTxt}>تم تعطيل حسابك. يرجى التواصل مع الإدارة</Text>
          </View>
        )}

        {submitted && !isBlocked && (
          <View style={s.successBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={s.successTxt}>تم نشر طلبك. سيتواصل معك المساعدون قريباً</Text>
            <TouchableOpacity onPress={() => setSubmitted(false)}>
              <Text style={s.newReqTxt}>طلب جديد</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Category */}
        <Text style={s.sectionLabel}>ساعدني في:</Text>
        <View style={s.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[s.catBtn, category === cat.value && s.catBtnActive, isBlocked && s.catBtnDisabled]}
              onPress={() => !isBlocked && setCategory(cat.value as CategoryValue)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={cat.icon as any}
                size={22}
                color={category === cat.value ? colors.primary : colors.mutedForeground}
              />
              <Text style={[s.catLabel, category === cat.value && s.catLabelActive]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Details */}
        <Text style={s.sectionLabel}>تفاصيل الطلب:</Text>
        <TextInput
          style={[s.textarea, isBlocked && s.inputDisabled]}
          value={details}
          onChangeText={setDetails}
          placeholder="مثال: أحتاج شخص ينقل أغراض من بوشر إلى الخوير"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          textAlign="right"
          placeholderTextColor={colors.mutedForeground}
          editable={!isBlocked}
        />

        {/* Time */}
        <Text style={s.sectionLabel}>متى؟</Text>
        <View style={s.timeRow}>
          {(["now", "scheduled"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.timeBtn, timeType === t && s.timeBtnActive, isBlocked && s.catBtnDisabled]}
              onPress={() => !isBlocked && setTimeType(t)}
              activeOpacity={0.8}
            >
              <Text style={[s.timeTxt, timeType === t && s.timeTxtActive]}>
                {t === "now" ? "الآن" : "لاحقاً"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Area */}
        <Text style={s.sectionLabel}>المنطقة:</Text>
        <TouchableOpacity
          style={[s.pickerBtn, isBlocked && s.inputDisabled]}
          onPress={() => !isBlocked && setAreaPickerVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
          <Text style={[s.pickerTxt, !area && s.pickerPlaceholder]}>
            {area || "اختر المنطقة"}
          </Text>
        </TouchableOpacity>

        {/* Amount */}
        <Text style={s.sectionLabel}>المبلغ المدفوع:</Text>
        <View style={s.amountRow}>
          <Text style={s.currency}>ر.ع.</Text>
          <TextInput
            style={[s.amountInput, isBlocked && s.inputDisabled]}
            value={amount}
            onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ""))}
            placeholder="0.000"
            keyboardType="decimal-pad"
            textAlign="right"
            placeholderTextColor={colors.mutedForeground}
            editable={!isBlocked}
          />
        </View>

        <TouchableOpacity
          style={[s.submitBtn, (loading || isBlocked) && s.submitBtnOff]}
          onPress={handleSubmit}
          disabled={loading || isBlocked}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.submitTxt}>{isBlocked ? "الحساب معطّل" : "انشر الطلب"}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Area picker modal */}
      <Modal visible={areaPickerVisible} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} onPress={() => setAreaPickerVisible(false)} />
        <View style={[s.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>اختر المنطقة</Text>
          <FlatList
            data={AREAS}
            keyExtractor={i => i}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.areaItem, area === item && s.areaItemActive]}
                onPress={() => { setArea(item); setAreaPickerVisible(false); }}
                activeOpacity={0.8}
              >
                {area === item && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                <Text style={[s.areaTxt, area === item && s.areaTxtActive]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>, top: number, tabH: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
      paddingHorizontal: 20, paddingTop: top + 12, paddingBottom: 12,
    },
    headerTitle: { fontSize: 24, fontWeight: "700", color: c.primary, textAlign: "right" },
    headerSub: { fontSize: 13, color: c.mutedForeground, textAlign: "right", marginTop: 2 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: tabH + bottom + 16 },
    blockedBanner: {
      backgroundColor: "#FEE2E2", borderRadius: 10, padding: 14,
      flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 16,
    },
    blockedTxt: { color: "#DC2626", fontSize: 13, fontWeight: "600", textAlign: "right", flex: 1 },
    successBanner: {
      backgroundColor: c.secondary, borderRadius: 10, padding: 14,
      flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 16,
    },
    successTxt: { color: c.secondaryForeground, fontSize: 13, flex: 1, textAlign: "right" },
    newReqTxt: { color: c.primary, fontSize: 13, fontWeight: "700" },
    sectionLabel: { fontSize: 14, fontWeight: "600", color: c.foreground, textAlign: "right", marginBottom: 10 },
    categoryGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginBottom: 20 },
    catBtn: {
      width: "31%", borderWidth: 2, borderColor: c.border, borderRadius: 10,
      padding: 12, alignItems: "center", gap: 6, backgroundColor: c.card,
    },
    catBtnActive: { borderColor: c.primary, backgroundColor: c.secondary },
    catBtnDisabled: { opacity: 0.4 },
    catLabel: { fontSize: 11, color: c.mutedForeground, textAlign: "center", fontWeight: "500" },
    catLabelActive: { color: c.primary, fontWeight: "700" },
    textarea: {
      borderWidth: 1.5, borderColor: c.input, borderRadius: 10, padding: 14,
      fontSize: 15, color: c.foreground, backgroundColor: c.card,
      minHeight: 100, textAlign: "right", marginBottom: 20,
    },
    inputDisabled: { opacity: 0.4 },
    timeRow: { flexDirection: "row-reverse", gap: 10, marginBottom: 20 },
    timeBtn: {
      flex: 1, borderWidth: 2, borderColor: c.border, borderRadius: 10,
      paddingVertical: 12, alignItems: "center", backgroundColor: c.card,
    },
    timeBtnActive: { borderColor: c.primary, backgroundColor: c.secondary },
    timeTxt: { fontSize: 14, color: c.mutedForeground, fontWeight: "500" },
    timeTxtActive: { color: c.primary, fontWeight: "700" },
    pickerBtn: {
      borderWidth: 1.5, borderColor: c.input, borderRadius: 10, paddingHorizontal: 14,
      paddingVertical: 14, flexDirection: "row-reverse", alignItems: "center",
      backgroundColor: c.card, gap: 8, marginBottom: 20,
    },
    pickerTxt: { flex: 1, fontSize: 15, color: c.foreground, textAlign: "right" },
    pickerPlaceholder: { color: c.mutedForeground },
    amountRow: {
      flexDirection: "row-reverse", alignItems: "center", borderWidth: 1.5,
      borderColor: c.input, borderRadius: 10, backgroundColor: c.card, marginBottom: 24,
    },
    currency: {
      paddingHorizontal: 14, fontSize: 14, color: c.mutedForeground,
      fontWeight: "600", borderRightWidth: 1, borderRightColor: c.border, paddingVertical: 14,
    },
    amountInput: { flex: 1, fontSize: 16, color: c.foreground, paddingHorizontal: 14, textAlign: "right" },
    submitBtn: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
    submitBtnOff: { opacity: 0.4 },
    submitTxt: { color: c.primaryForeground, fontSize: 16, fontWeight: "700" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    modalSheet: {
      backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      maxHeight: "60%", paddingTop: 12,
    },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: 12 },
    modalTitle: { fontSize: 16, fontWeight: "700", color: c.foreground, textAlign: "center", marginBottom: 8 },
    areaItem: {
      flexDirection: "row-reverse", alignItems: "center", gap: 10,
      paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    areaItemActive: { backgroundColor: c.secondary },
    areaTxt: { fontSize: 15, color: c.foreground, flex: 1, textAlign: "right" },
    areaTxtActive: { color: c.primary, fontWeight: "700" },
  });
