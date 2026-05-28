import React, { useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Platform,
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
}

function fetchMyRequests(customerId: number): Promise<HelpRequest[]> {
  return fetch(`${BASE}/api/requests?customerId=${customerId}`, { credentials: "include" })
    .then(r => r.json());
}

function cancelRequestFetch(id: number): Promise<void> {
  return fetch(`${BASE}/api/requests/${id}/cancel`, { method: "PATCH", credentials: "include" })
    .then(r => { if (!r.ok) throw new Error("فشل الإلغاء"); });
}

export default function CustomerMyRequestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();
  const top = Platform.OS === "web" ? 67 : insets.top;
  const tabH = Platform.OS === "web" ? 84 : 80;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["my-requests", user?.id],
    queryFn: () => (user ? fetchMyRequests(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelRequestFetch,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["my-requests", user?.id] });
    },
    onError: () => Alert.alert("خطأ", "تعذر إلغاء الطلب"),
  });

  function confirmCancel(id: number) {
    Alert.alert("إلغاء الطلب", "هل أنت متأكد من إلغاء هذا الطلب؟", [
      { text: "لا", style: "cancel" },
      {
        text: "نعم، إلغاء", style: "destructive",
        onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); cancelMutation.mutate(id); },
      },
    ]);
  }

  const catLabel = useCallback((v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v, []);
  const s = makeStyles(colors, top, tabH, insets.bottom);

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: HelpRequest }) => {
    const status = STATUS_INFO[item.status] ?? { label: item.status, color: "#6B7280", bg: "#F3F4F6" };
    const isActive = item.status === "available" || item.status === "accepted";
    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={[s.badge, { backgroundColor: status.bg }]}>
            <Text style={[s.badgeTxt, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={s.catTxt}>{catLabel(item.category)}</Text>
        </View>
        <Text style={s.details} numberOfLines={2}>{item.details}</Text>
        <View style={s.cardMeta}>
          <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
          <Text style={s.metaTxt}>{item.area}</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaTxt}>{item.offeredAmount} ر.ع.</Text>
        </View>
        {isActive && (
          <TouchableOpacity style={s.cancelBtn} onPress={() => confirmCancel(item.id)} activeOpacity={0.8}>
            <Text style={s.cancelTxt}>إلغاء الطلب</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>طلباتي</Text>
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={i => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="document-text-outline" size={48} color={colors.mutedForeground} />
            <Text style={s.emptyTxt}>لا توجد طلبات بعد</Text>
            <Text style={s.emptyHint}>انشر طلبك الأول من تبويب "طلب جديد"</Text>
          </View>
        }
      />
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>, top: number, tabH: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background },
    header: {
      backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
      paddingHorizontal: 20, paddingTop: top + 12, paddingBottom: 12,
    },
    headerTitle: { fontSize: 22, fontWeight: "700", color: c.foreground, textAlign: "right" },
    listContent: { padding: 16, paddingBottom: tabH + bottom + 16 },
    card: {
      backgroundColor: c.card, borderRadius: c.radius, borderWidth: 1, borderColor: c.border,
      padding: 16, marginBottom: 12,
    },
    cardTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
    badgeTxt: { fontSize: 12, fontWeight: "700" },
    catTxt: { fontSize: 15, fontWeight: "700", color: c.foreground },
    details: { fontSize: 14, color: c.mutedForeground, textAlign: "right", lineHeight: 20, marginBottom: 10 },
    cardMeta: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
    metaTxt: { fontSize: 12, color: c.mutedForeground },
    metaDot: { fontSize: 12, color: c.mutedForeground },
    cancelBtn: {
      marginTop: 12, borderWidth: 1.5, borderColor: "#EF4343", borderRadius: 8,
      paddingVertical: 10, alignItems: "center",
    },
    cancelTxt: { color: "#EF4343", fontSize: 14, fontWeight: "600" },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 8 },
    emptyTxt: { fontSize: 17, fontWeight: "700", color: c.foreground },
    emptyHint: { fontSize: 14, color: c.mutedForeground, textAlign: "center" },
  });
