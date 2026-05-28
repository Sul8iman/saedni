import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Linking, Alert, ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { CATEGORIES } from "@/constants/categories";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

interface HelpRequest {
  id: number;
  category: string;
  details: string;
  area: string;
  timeType: string;
  offeredAmount: number;
  status: string;
  createdAt: string;
  customerName?: string | null;
  customerPhone?: string | null;
}

export default function HelperRequestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [catFilter, setCatFilter] = useState("all");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["available-requests", catFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ status: "available" });
      if (catFilter !== "all") params.set("category", catFilter);
      const r = await fetch(`${BASE}/api/requests?${params}`, { credentials: "include" });
      return r.json() as Promise<HelpRequest[]>;
    },
  });

  function openWhatsApp(phone: string) {
    Linking.openURL(
      `https://wa.me/${phone}?text=${encodeURIComponent("مرحباً، رأيت طلبك في تطبيق ساعدني وأنا مستعد للمساعدة")}`
    );
  }

  function openCall(phone: string) {
    Linking.openURL(`tel:${phone}`);
  }

  const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v;
  const s = makeStyles(colors, insets.bottom);

  const renderItem = ({ item }: { item: HelpRequest }) => (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.amount}>{item.offeredAmount} <Text style={s.amountCur}>ر.ع.</Text></Text>
        <Text style={s.catTxt}>{catLabel(item.category)}</Text>
      </View>

      <Text style={s.details}>{item.details}</Text>

      <View style={s.metaRow}>
        <View style={s.metaChip}>
          <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
          <Text style={s.metaTxt}>{item.area}</Text>
        </View>
        <View style={s.metaChip}>
          <Ionicons name={item.timeType === "now" ? "flash" : "calendar-outline"} size={13} color={colors.mutedForeground} />
          <Text style={s.metaTxt}>{item.timeType === "now" ? "الآن" : "لاحقاً"}</Text>
        </View>
      </View>

      <View style={s.actions}>
        <TouchableOpacity
          style={s.waBtn}
          onPress={() => item.customerPhone && openWhatsApp(item.customerPhone)}
          activeOpacity={0.85}
          disabled={!item.customerPhone}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#fff" />
          <Text style={s.waBtnTxt}>واتساب</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.callBtn}
          onPress={() => item.customerPhone && openCall(item.customerPhone)}
          activeOpacity={0.85}
          disabled={!item.customerPhone}
        >
          <Ionicons name="call-outline" size={18} color={colors.primary} />
          <Text style={s.callBtnTxt}>اتصال</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <SafeAreaView edges={["top"]} style={s.headerSafe}>
        <View style={s.headerInner}>
          <Text style={s.headerTitle}>الطلبات المتاحة</Text>
          {!isLoading && (
            <View style={s.countBadge}>
              <Text style={s.countTxt}>{(data ?? []).length}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtersContent}
        style={s.filters}
      >
        {[{ value: "all", label: "الكل" }, ...CATEGORIES.map(c => ({ value: c.value, label: c.label }))].map(f => (
          <TouchableOpacity
            key={f.value}
            style={[s.chip, catFilter === f.value && s.chipActive]}
            onPress={() => setCatFilter(f.value)}
            activeOpacity={0.8}
          >
            <Text style={[s.chipTxt, catFilter === f.value && s.chipTxtActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="search-outline" size={56} color={colors.border} />
              <Text style={s.emptyTitle}>لا توجد طلبات متاحة</Text>
              <Text style={s.emptyHint}>ارجع لاحقاً للاطلاع على الطلبات الجديدة</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>, bottomInset: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    headerSafe: { backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
    headerInner: {
      paddingHorizontal: 20, paddingVertical: 14,
      flexDirection: "row-reverse", alignItems: "center", gap: 10,
    },
    headerTitle: { fontSize: 22, fontWeight: "800", color: c.foreground },
    countBadge: { backgroundColor: c.secondary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    countTxt: { fontSize: 12, fontWeight: "700", color: c.primary },
    filters: { flexGrow: 0, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
    filtersContent: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row-reverse", gap: 8 },
    chip: {
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
      borderWidth: 1.5, borderColor: c.border, backgroundColor: c.background,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipTxt: { fontSize: 13, color: c.mutedForeground, fontWeight: "600" },
    chipTxtActive: { color: c.primaryForeground, fontWeight: "700" },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { padding: 16, paddingBottom: bottomInset + 96 },
    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 16, marginBottom: 12,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    cardTop: {
      flexDirection: "row-reverse", alignItems: "flex-start",
      justifyContent: "space-between", marginBottom: 10,
    },
    catTxt: { fontSize: 16, fontWeight: "700", color: c.foreground, flexShrink: 1, textAlign: "right" },
    amount: { fontSize: 22, fontWeight: "800", color: c.primary },
    amountCur: { fontSize: 14, fontWeight: "600" },
    details: {
      fontSize: 14, color: c.mutedForeground, textAlign: "right",
      lineHeight: 21, marginBottom: 12,
    },
    metaRow: { flexDirection: "row-reverse", gap: 8, marginBottom: 14, flexWrap: "wrap" },
    metaChip: {
      flexDirection: "row-reverse", alignItems: "center", gap: 4,
      backgroundColor: c.muted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    },
    metaTxt: { fontSize: 12, color: c.mutedForeground, fontWeight: "500" },
    actions: { flexDirection: "row-reverse", gap: 10 },
    waBtn: {
      flex: 1, backgroundColor: "#25D366", borderRadius: 10, paddingVertical: 11,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6,
    },
    waBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
    callBtn: {
      flex: 1, backgroundColor: c.secondary, borderRadius: 10, paddingVertical: 11,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6,
      borderWidth: 1.5, borderColor: c.border,
    },
    callBtnTxt: { color: c.primary, fontSize: 14, fontWeight: "700" },
    empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: c.foreground },
    emptyHint: { fontSize: 14, color: c.mutedForeground, textAlign: "center" },
  });
