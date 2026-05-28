import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
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

  async function handleSubmit() {
    if (!category || !details.trim() || !area || !amount) {
      Alert.alert("تنبيه", "يرجى تعبئة جميع الحقول");
      return;
    }
    if (!user || isBlocked) {
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
          customerId: user.id, category, details, timeType, area,
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
      setCategory(""); setDetails(""); setArea(""); setAmount(""); setTimeType("now");
    } catch { Alert.alert("خطأ", "تعذر الاتصال بالخادم"); }
    finally { setLoading(false); }
  }

  const s = makeStyles(colors, insets.bottom);

  return (
    <View style={s.container}>
      {/* Header with safe area */}
      <SafeAreaView edges={["top"]} style={s.headerSafe}>
        <View style={s.headerInner}>
          <Text style={s.headerSub}>ماذا تحتاج اليوم؟</Text>
          <Text style={s.headerTitle}>ساعدني</Text>
        </View>
      </SafeAreaView>

      <KeyboardAwareScrollViewCompat
        style={s.scroll}
        contentContainerStyle={s.content}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Blocked banner */}
        {isBlocked && (
          <View style={s.alertBox}>
            <Ionicons name="shield-outline" size={18} color="#DC2626" />
            <Text style={s.alertTxt}>تم تعطيل حسابك. يرجى التواصل مع الإدارة</Text>
          </View>
        )}

        {/* Success banner */}
        {submitted && !isBlocked && (
          <View style={s.successBox}>
            <View style={s.successLeft}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={s.successTxt}>تم نشر طلبك بنجاح</Text>
            </View>
            <TouchableOpacity onPress={() => setSubmitted(false)}>
              <Text style={s.newReqBtn}>+ طلب جديد</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Category — 2 rows × 3 columns */}
        <Text style={s.sectionLabel}>ساعدني في:</Text>
        <View style={s.catGrid}>
          {([CATEGORIES.slice(0, 3), CATEGORIES.slice(3, 6)] as const).map((row, rowIdx) => (
            <View key={rowIdx} style={s.catRow}>
              {[...row].reverse().map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[s.catCard, category === cat.value && s.catCardActive]}
                  onPress={() => !isBlocked && setCategory(cat.value as CategoryValue)}
                  activeOpacity={0.8}
                  disabled={!!isBlocked}
                >
                  <View style={[s.catIconWrap, category === cat.value && s.catIconWrapActive]}>
                    <Ionicons
                      name={cat.icon as any}
                      size={26}
                      color={category === cat.value ? colors.primary : colors.mutedForeground}
                    />
                  </View>
                  <Text style={[s.catLabel, category === cat.value && s.catLabelActive]} numberOfLines={2}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Details */}
        <Text style={s.sectionLabel}>تفاصيل الطلب</Text>
        <TextInput
          style={[s.textarea, isBlocked && s.disabled]}
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
        <Text style={s.sectionLabel}>الوقت</Text>
        <View style={s.segmented}>
          {(["now", "scheduled"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.segBtn, timeType === t && s.segBtnActive]}
              onPress={() => !isBlocked && setTimeType(t)}
              activeOpacity={0.8}
              disabled={!!isBlocked}
            >
              <Ionicons
                name={t === "now" ? "flash" : "calendar-outline"}
                size={16}
                color={timeType === t ? colors.primaryForeground : colors.mutedForeground}
              />
              <Text style={[s.segTxt, timeType === t && s.segTxtActive]}>
                {t === "now" ? "الآن" : "لاحقاً"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Area */}
        <Text style={s.sectionLabel}>المنطقة</Text>
        <TouchableOpacity
          style={[s.picker, isBlocked && s.disabled]}
          onPress={() => !isBlocked && setAreaPickerVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
          <Text style={[s.pickerTxt, !area && s.pickerPlaceholder]}>
            {area || "اختر المنطقة"}
          </Text>
          <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Amount */}
        <Text style={s.sectionLabel}>المبلغ المدفوع</Text>
        <View style={[s.amountRow, isBlocked && s.disabled]}>
          <Text style={s.currencyLabel}>ر.ع.</Text>
          <TextInput
            style={s.amountInput}
            value={amount}
            onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ""))}
            placeholder="0.000"
            keyboardType="decimal-pad"
            textAlign="right"
            placeholderTextColor={colors.mutedForeground}
            editable={!isBlocked}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, (loading || !!isBlocked) && s.submitDisabled]}
          onPress={handleSubmit}
          disabled={loading || !!isBlocked}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={colors.primaryForeground} />
            : (
              <View style={s.submitInner}>
                <Ionicons name="arrow-up-circle" size={20} color={colors.primaryForeground} />
                <Text style={s.submitTxt}>{isBlocked ? "الحساب معطّل" : "انشر الطلب"}</Text>
              </View>
            )}
        </TouchableOpacity>
      </KeyboardAwareScrollViewCompat>

      {/* Area picker modal */}
      <Modal visible={areaPickerVisible} transparent animationType="slide" statusBarTranslucent>
        <TouchableOpacity style={s.overlay} onPress={() => setAreaPickerVisible(false)} activeOpacity={1} />
        <SafeAreaView edges={["bottom"]} style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>اختر المنطقة</Text>
          <FlatList
            data={AREAS}
            keyExtractor={i => i}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.areaRow, area === item && s.areaRowActive]}
                onPress={() => { setArea(item); setAreaPickerVisible(false); }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={area === item ? "checkmark-circle" : "location-outline"}
                  size={18}
                  color={area === item ? colors.primary : colors.mutedForeground}
                />
                <Text style={[s.areaTxt, area === item && s.areaTxtActive]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>, bottomInset: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    headerSafe: { backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
    headerInner: { paddingHorizontal: 20, paddingVertical: 14 },
    headerTitle: { fontSize: 26, fontWeight: "800", color: c.primary, textAlign: "right" },
    headerSub: { fontSize: 13, color: c.mutedForeground, textAlign: "right" },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: bottomInset + 100 },
    alertBox: {
      backgroundColor: "#FEE2E2", borderRadius: 12, padding: 14,
      flexDirection: "row-reverse", alignItems: "center", gap: 10, marginBottom: 16,
    },
    alertTxt: { color: "#DC2626", fontSize: 14, fontWeight: "600", flex: 1, textAlign: "right" },
    successBox: {
      backgroundColor: c.secondary, borderRadius: 12, padding: 14,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 16,
    },
    successLeft: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
    successTxt: { color: c.secondaryForeground, fontSize: 14, fontWeight: "600" },
    newReqBtn: { color: c.primary, fontSize: 14, fontWeight: "700" },
    sectionLabel: {
      fontSize: 14, fontWeight: "700", color: c.foreground,
      textAlign: "right", marginBottom: 10, marginTop: 4,
    },
    catGrid: { gap: 10, marginBottom: 20 },
    catRow: { flexDirection: "row-reverse", gap: 10 },
    catCard: {
      flex: 1, borderWidth: 2, borderColor: c.border, borderRadius: 16,
      paddingVertical: 14, paddingHorizontal: 6,
      alignItems: "center", gap: 8, backgroundColor: c.card,
    },
    catCardActive: { borderColor: c.primary, backgroundColor: c.secondary },
    catIconWrap: {
      width: 48, height: 48, borderRadius: 14,
      backgroundColor: c.muted, alignItems: "center", justifyContent: "center",
    },
    catIconWrapActive: { backgroundColor: c.secondary },
    catLabel: { fontSize: 11, color: c.mutedForeground, textAlign: "center", fontWeight: "600", lineHeight: 14 },
    catLabelActive: { color: c.primary, fontWeight: "700" },
    textarea: {
      borderWidth: 1.5, borderColor: c.border, borderRadius: 14, padding: 14,
      fontSize: 15, color: c.foreground, backgroundColor: c.card,
      minHeight: 110, textAlign: "right", marginBottom: 20, lineHeight: 22,
    },
    disabled: { opacity: 0.4 },
    segmented: {
      flexDirection: "row-reverse", backgroundColor: c.muted, borderRadius: 12,
      padding: 4, marginBottom: 20,
    },
    segBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 10,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6,
    },
    segBtnActive: { backgroundColor: c.primary },
    segTxt: { fontSize: 14, color: c.mutedForeground, fontWeight: "600" },
    segTxtActive: { color: c.primaryForeground, fontWeight: "700" },
    picker: {
      borderWidth: 1.5, borderColor: c.border, borderRadius: 14, paddingHorizontal: 16,
      paddingVertical: 14, flexDirection: "row-reverse", alignItems: "center",
      backgroundColor: c.card, gap: 8, marginBottom: 20,
    },
    pickerTxt: { flex: 1, fontSize: 15, color: c.foreground, textAlign: "right", fontWeight: "500" },
    pickerPlaceholder: { color: c.mutedForeground, fontWeight: "400" },
    amountRow: {
      flexDirection: "row-reverse", alignItems: "center", borderWidth: 1.5,
      borderColor: c.border, borderRadius: 14, backgroundColor: c.card, marginBottom: 24, overflow: "hidden",
    },
    currencyLabel: {
      paddingHorizontal: 16, fontSize: 14, color: c.mutedForeground, fontWeight: "700",
      borderRightWidth: 1.5, borderRightColor: c.border, paddingVertical: 14, backgroundColor: c.muted,
    },
    amountInput: { flex: 1, fontSize: 17, color: c.foreground, paddingHorizontal: 16, textAlign: "right", paddingVertical: 14 },
    submitBtn: {
      backgroundColor: c.primary, borderRadius: 14, paddingVertical: 17, alignItems: "center",
      shadowColor: c.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    submitDisabled: { opacity: 0.4, shadowOpacity: 0 },
    submitInner: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
    submitTxt: { color: c.primaryForeground, fontSize: 17, fontWeight: "700" },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: {
      backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      maxHeight: "65%", paddingTop: 8,
    },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: 8 },
    sheetTitle: { fontSize: 17, fontWeight: "700", color: c.foreground, textAlign: "center", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.border },
    areaRow: {
      flexDirection: "row-reverse", alignItems: "center", gap: 12,
      paddingHorizontal: 20, paddingVertical: 15,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
    },
    areaRowActive: { backgroundColor: c.secondary },
    areaTxt: { fontSize: 15, color: c.foreground, flex: 1, textAlign: "right", fontWeight: "500" },
    areaTxtActive: { color: c.primary, fontWeight: "700" },
  });
