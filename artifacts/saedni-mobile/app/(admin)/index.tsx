import React from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Platform, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, STATUS_INFO } from "@/constants/categories";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

interface Stats {
  totalUsers: number;
  totalHelpers: number;
  totalCustomers: number;
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  cancelledRequests: number;
}

interface HelpRequest {
  id: number;
  category: string;
  details: string;
  area: string;
  offeredAmount: number;
  status: string;
  customerName?: string | null;
  createdAt: string;
}

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const qc = useQueryClient();
  const top = Platform.OS === "web" ? 67 : insets.top;

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/admin/stats`, { credentials: "include" });
      return r.json() as Promise<Stats>;
    },
  });

  const { data: requests, isLoading: reqLoading, refetch: refetchReqs, isRefetching } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/requests`, { credentials: "include" });
      return r.json() as Promise<HelpRequest[]>;
    },
  });

  const deleteReqMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${BASE}/api/requests/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: () => Alert.alert("خطأ", "تعذر حذف الطلب"),
  });

  function confirmDelete(id: number) {
    Alert.alert("حذف الطلب", "هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => deleteReqMutation.mutate(id) },
    ]);
  }

  function handleLogout() {
    Alert.alert("تسجيل الخروج", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: async () => { await logout(); router.replace("/"); } },
    ]);
  }

  const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v;
  const s = makeStyles(colors, top, insets.bottom);

  const statsData = [
    { label: "إجمالي المستخدمين", val: stats?.totalUsers ?? 0, icon: "people-outline" as const, color: colors.primary },
    { label: "العملاء", val: stats?.totalCustomers ?? 0, icon: "person-outline" as const, color: "#6366F1" },
    { label: "المساعدون", val: stats?.totalHelpers ?? 0, icon: "hand-right-outline" as const, color: "#F59E0B" },
    { label: "إجمالي الطلبات", val: stats?.totalRequests ?? 0, icon: "document-text-outline" as const, color: "#10B981" },
    { label: "النشطة", val: stats?.activeRequests ?? 0, icon: "flash-outline" as const, color: colors.primary },
    { label: "المنتهية", val: stats?.completedRequests ?? 0, icon: "checkmark-circle-outline" as const, color: "#6B7280" },
  ];

  const renderRequest = ({ item }: { item: HelpRequest }) => {
    const status = STATUS_INFO[item.status] ?? { label: item.status, color: "#6B7280", bg: "#F3F4F6" };
    return (
      <View style={s.reqCard}>
        <View style={s.reqTop}>
          <TouchableOpacity onPress={() => confirmDelete(item.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color="#EF4343" />
          </TouchableOpacity>
          <View style={[s.badge, { backgroundColor: status.bg }]}>
            <Text style={[s.badgeTxt, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={s.catTxt}>{catLabel(item.category)}</Text>
        </View>
        <Text style={s.reqDetails} numberOfLines={1}>{item.details}</Text>
        <View style={s.reqMeta}>
          <Text style={s.metaTxt}>{item.offeredAmount} ر.ع.</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaTxt}>{item.area}</Text>
          {item.customerName && <><Text style={s.metaDot}>·</Text><Text style={s.metaTxt}>{item.customerName}</Text></>}
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleLogout} hitSlop={8}>
          <Ionicons name="log-out-outline" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>لوحة الإدارة</Text>
        <TouchableOpacity onPress={() => router.push("/(admin)/users")} hitSlop={8}>
          <Ionicons name="people-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {statsLoading ? (
        <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={requests ?? []}
          keyExtractor={i => String(i.id)}
          renderItem={renderRequest}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => { refetchStats(); refetchReqs(); }} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <View>
              {/* Stats grid */}
              <View style={s.statsGrid}>
                {statsData.map((st, i) => (
                  <View key={i} style={s.statCard}>
                    <View style={[s.statIcon, { backgroundColor: st.color + "18" }]}>
                      <Ionicons name={st.icon} size={20} color={st.color} />
                    </View>
                    <Text style={s.statVal}>{st.val}</Text>
                    <Text style={s.statLabel}>{st.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.sectionTitle}>جميع الطلبات</Text>
            </View>
          }
          ListEmptyComponent={
            !reqLoading ? (
              <View style={s.empty}>
                <Ionicons name="document-text-outline" size={48} color={colors.mutedForeground} />
                <Text style={s.emptyTxt}>لا توجد طلبات</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>, top: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    header: {
      backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
      paddingHorizontal: 20, paddingTop: top + 12, paddingBottom: 12,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    },
    headerTitle: { fontSize: 20, fontWeight: "700", color: c.foreground },
    listContent: { padding: 16, paddingBottom: bottom + 24 },
    statsGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, marginBottom: 20 },
    statCard: {
      width: "31%", backgroundColor: c.card, borderRadius: 10, borderWidth: 1,
      borderColor: c.border, padding: 12, alignItems: "flex-end", gap: 4,
    },
    statIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    statVal: { fontSize: 22, fontWeight: "800", color: c.foreground },
    statLabel: { fontSize: 11, color: c.mutedForeground, textAlign: "right" },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: c.foreground, textAlign: "right", marginBottom: 12 },
    reqCard: {
      backgroundColor: c.card, borderRadius: c.radius, borderWidth: 1,
      borderColor: c.border, padding: 14, marginBottom: 10,
    },
    reqTop: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 6 },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    badgeTxt: { fontSize: 11, fontWeight: "700" },
    catTxt: { fontSize: 14, fontWeight: "700", color: c.foreground, flex: 1, textAlign: "right" },
    reqDetails: { fontSize: 13, color: c.mutedForeground, textAlign: "right", marginBottom: 6 },
    reqMeta: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
    metaTxt: { fontSize: 12, color: c.mutedForeground },
    metaDot: { fontSize: 12, color: c.mutedForeground, marginHorizontal: 2 },
    empty: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8 },
    emptyTxt: { fontSize: 16, color: c.mutedForeground },
  });
