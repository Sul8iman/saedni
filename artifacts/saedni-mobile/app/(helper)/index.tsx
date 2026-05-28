import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Linking, Alert, ScrollView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, STATUS_INFO } from "@/constants/categories";

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
  const { user } = useAuth();
  const qc = useQueryClient();
  const [catFilter, setCatFilter] = useState("all");
  const top = Platform.OS === "web" ? 67 : insets.top;
  const tabH = Platform.OS === "web" ? 84 : 80;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["available-requests", catFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ status: "available" });
      if (catFilter !== "all") params.set("category", catFilter);
      const r = await fetch(`${BASE}/api/requests?${params}`, { credentials: "include" });
      return r.json() as Promise<HelpRequest[]>;
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (reqId: number) => {
      const r = await fetch(`${BASE}/api/requests/${reqId}/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ helperId: user?.id }),
      });
      if (!r.ok) throw new Error("failed");
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["available-requests"] });
    },
    onError: () => Alert.alert("خطأ", "تعذر قبول الطلب"),
  });

  function openWhatsApp(phone: string) {
    const msg = encodeURIComponent("مرحباً، رأيت طلبك في تطبيق ساعدني وأنا مستعد للمساعدة");
    Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
  }

  function openCall(phone: string) {
    Linking.openURL(`tel:${phone}`);
  }

  const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v;

  const s = makeStyles(colors, top, tabH, insets.bottom);

  const renderItem = ({ item }: { item: HelpRequest }) => (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.amount}>{item.offeredAmount} ر.ع.</Text>
        <Text style={s.catTxt}>{catLabel(item.category)}</Text>
      </View>
      <Text style={s.details}>{item.details}</Text>
      <View style={s.cardMeta}>
        <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
        <Text style={s.metaTxt}>{item.area}</Text>
        <Text style={s.metaDot}>·</Text>
        <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
        <Text style={s.metaTxt}>{item.timeType === "now" ? "الآن" : "لاحقاً"}</Text>
      </View>
      <View style={s.actions}>
        <TouchableOpacity
          style={s.waBtn}
          onPress={() => item.customerPhone && openWhatsApp(item.customerPhone)}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#fff" />
          <Text style={s.waTxt}>مراسلة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.callBtn}
          onPress={() => item.customerPhone && openCall(item.customerPhone)}
          activeOpacity={0.8}
        >
          <Ionicons name="call-outline" size={18} color={colors.primary} />
          <Text style={s.callTxt}>اتصال</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>الطلبات المتاحة</Text>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filtersContent}
        style={s.filters}
      >
        <TouchableOpacity
          style={[s.chip, catFilter === "all" && s.chipActive]}
          onPress={() => setCatFilter("all")}
          activeOpacity={0.8}
        >
          <Text style={[s.chipTxt, catFilter === "all" && s.chipTxtActive]}>الكل</Text>
        </TouchableOpacity>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.value}
            style={[s.chip, catFilter === cat.value && s.chipActive]}
            onPress={() => setCatFilter(cat.value)}
            activeOpacity={0.8}
          >
            <Text style={[s.chipTxt, catFilter === cat.value && s.chipTxtActive]}>{cat.label}</Text>
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
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
              <Text style={s.emptyTxt}>لا توجد طلبات متاحة</Text>
              <Text style={s.emptyHint}>ارجع لاحقاً للاطلاع على الطلبات الجديدة</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>, top: number, tabH: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    header: {
      backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
      paddingHorizontal: 20, paddingTop: top + 12, paddingBottom: 12,
    },
    headerTitle: { fontSize: 22, fontWeight: "700", color: c.foreground, textAlign: "right" },
    filters: { flexGrow: 0, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
    filtersContent: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row-reverse", gap: 8 },
    chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.background },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipTxt: { fontSize: 13, color: c.mutedForeground, fontWeight: "500" },
    chipTxtActive: { color: c.primaryForeground, fontWeight: "700" },
    listContent: { padding: 16, paddingBottom: tabH + bottom + 16 },
    card: {
      backgroundColor: c.card, borderRadius: c.radius, borderWidth: 1, borderColor: c.border,
      padding: 16, marginBottom: 12,
    },
    cardTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    catTxt: { fontSize: 15, fontWeight: "700", color: c.foreground },
    amount: { fontSize: 18, fontWeight: "800", color: c.primary },
    details: { fontSize: 14, color: c.mutedForeground, textAlign: "right", lineHeight: 20, marginBottom: 10 },
    cardMeta: { flexDirection: "row-reverse", alignItems: "center", gap: 4, marginBottom: 14 },
    metaTxt: { fontSize: 12, color: c.mutedForeground },
    metaDot: { fontSize: 12, color: c.mutedForeground, marginHorizontal: 2 },
    actions: { flexDirection: "row-reverse", gap: 10 },
    waBtn: {
      flex: 1, backgroundColor: "#25D366", borderRadius: 8, paddingVertical: 10,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6,
    },
    waTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
    callBtn: {
      flex: 1, backgroundColor: c.secondary, borderRadius: 8, paddingVertical: 10,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6,
      borderWidth: 1.5, borderColor: c.primary,
    },
    callTxt: { color: c.primary, fontSize: 14, fontWeight: "700" },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
    emptyTxt: { fontSize: 17, fontWeight: "700", color: c.foreground },
    emptyHint: { fontSize: 14, color: c.mutedForeground, textAlign: "center" },
  });
