import React, { useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
}

export default function CustomerMyRequestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["my-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const r = await fetch(`${BASE}/api/requests?customerId=${user.id}`, { credentials: "include" });
      return r.json() as Promise<HelpRequest[]>;
    },
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`${BASE}/api/requests/${id}/cancel`, { method: "PATCH", credentials: "include" })
        .then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["my-requests", user?.id] });
    },
    onError: () => Alert.alert("خطأ", "تعذر إلغاء الطلب"),
  });

  const confirmCancel = useCallback((id: number) => {
    Alert.alert("إلغاء الطلب", "هل أنت متأكد؟", [
      { text: "لا", style: "cancel" },
      { text: "نعم، إلغاء", style: "destructive", onPress: () => cancelMutation.mutate(id) },
    ]);
  }, []);

  const catLabel = useCallback((v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v, []);
  const s = makeStyles(colors, insets.bottom);

  const renderItem = ({ item }: { item: HelpRequest }) => {
    const st = STATUS_INFO[item.status] ?? { label: item.status, color: "#6B7280", bg: "#F3F4F6" };
    const isActive = item.status === "available" || item.status === "accepted";
    return (
      <View style={s.card}>
        <View style={s.cardRow}>
          <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
          </View>
          <Text style={s.catLabel}>{catLabel(item.category)}</Text>
        </View>
        <Text style={s.details} numberOfLines={2}>{item.details}</Text>
        <View style={s.metaRow}>
          <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
          <Text style={s.metaTxt}>{item.area}</Text>
          <View style={s.dot} />
          <Ionicons name="cash-outline" size={13} color={colors.mutedForeground} />
          <Text style={s.metaTxt}>{item.offeredAmount} ر.ع.</Text>
          {item.timeType === "now" && (
            <>
              <View style={s.dot} />
              <Ionicons name="flash" size={13} color={colors.mutedForeground} />
              <Text style={s.metaTxt}>الآن</Text>
            </>
          )}
        </View>
        {isActive && (
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={() => confirmCancel(item.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
            <Text style={s.cancelTxt}>إلغاء الطلب</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <SafeAreaView edges={["top"]} style={s.headerSafe}>
        <View style={s.headerInner}>
          <Text style={s.headerTitle}>طلباتي</Text>
          {!isLoading && data && (
            <View style={s.countBadge}>
              <Text style={s.countTxt}>{data.length}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

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
              <Ionicons name="document-text-outline" size={56} color={colors.border} />
              <Text style={s.emptyTitle}>لا توجد طلبات بعد</Text>
              <Text style={s.emptyHint}>انشر طلبك الأول من تبويب "طلب جديد"</Text>
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
    countBadge: {
      backgroundColor: c.secondary, borderRadius: 10,
      paddingHorizontal: 8, paddingVertical: 2,
    },
    countTxt: { fontSize: 12, fontWeight: "700", color: c.primary },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    listContent: { padding: 16, paddingBottom: bottomInset + 96 },
    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 16, marginBottom: 12,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    cardRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    statusTxt: { fontSize: 12, fontWeight: "700" },
    catLabel: { fontSize: 16, fontWeight: "700", color: c.foreground },
    details: { fontSize: 14, color: c.mutedForeground, textAlign: "right", lineHeight: 21, marginBottom: 12 },
    metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 5, flexWrap: "wrap" },
    metaTxt: { fontSize: 12, color: c.mutedForeground },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: c.mutedForeground },
    cancelBtn: {
      marginTop: 14, borderWidth: 1.5, borderColor: "#FECACA", borderRadius: 10,
      paddingVertical: 10, flexDirection: "row-reverse", alignItems: "center",
      justifyContent: "center", gap: 6, backgroundColor: "#FEF2F2",
    },
    cancelTxt: { color: "#DC2626", fontSize: 14, fontWeight: "700" },
    empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: c.foreground },
    emptyHint: { fontSize: 14, color: c.mutedForeground, textAlign: "center" },
  });
