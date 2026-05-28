import React from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, STATUS_INFO } from "@/constants/categories";

const BASE = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "";

interface Stats {
  totalUsers: number; totalHelpers: number; totalCustomers: number;
  totalRequests: number; activeRequests: number; completedRequests: number; cancelledRequests: number;
}
interface HelpRequest {
  id: number; category: string; details: string; area: string;
  timeType: string; scheduledDateTime?: string | null;
  offeredAmount: number; status: string; customerName?: string | null;
  createdAt: string;
}

function fmtScheduled(iso: string) {
  const d = new Date(iso);
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const min = d.getMinutes().toString().padStart(2, "0");
  const period = h >= 12 ? "مساءً" : "صباحاً";
  h = h % 12 || 12;
  return `${dd}/${mm}/${yyyy} - ${h}:${min} ${period}`;
}

function fmtDateShort(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

const STAT_DEFS = (stats: Stats | undefined, c: string) => [
  { label: "المستخدمون", val: stats?.totalUsers ?? 0,      icon: "people-outline",           color: c },
  { label: "العملاء",    val: stats?.totalCustomers ?? 0,  icon: "person-outline",           color: "#6366F1" },
  { label: "المساعدون",  val: stats?.totalHelpers ?? 0,    icon: "hand-right-outline",       color: "#F59E0B" },
  { label: "الطلبات",    val: stats?.totalRequests ?? 0,   icon: "document-text-outline",    color: "#10B981" },
  { label: "النشطة",     val: stats?.activeRequests ?? 0,  icon: "flash-outline",            color: c },
  { label: "المنتهية",   val: stats?.completedRequests ?? 0, icon: "checkmark-done-outline", color: "#6B7280" },
];

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const qc = useQueryClient();

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/admin/stats`, { credentials: "include" });
      return r.json() as Promise<Stats>;
    },
  });

  const { data: requests, isLoading, refetch: refetchReqs, isRefetching } = useQuery({
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

  function handleLogout() {
    Alert.alert("تسجيل الخروج", "هل تريد الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "خروج", style: "destructive", onPress: async () => { await logout(); router.replace("/"); } },
    ]);
  }

  const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v;
  const s = makeStyles(colors, insets.bottom);
  const statDefs = STAT_DEFS(stats, colors.primary);

  const renderRequest = ({ item }: { item: HelpRequest }) => {
    const st = STATUS_INFO[item.status] ?? { label: item.status, color: "#6B7280", bg: "#F3F4F6" };
    return (
      <View style={s.reqCard}>
        <View style={s.reqTop}>
          <View style={s.reqLeft}>
            <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
              <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
            </View>
            <Text style={s.reqAmount}>{item.offeredAmount} ر.ع.</Text>
          </View>
          <Text style={s.reqCat}>{catLabel(item.category)}</Text>
        </View>
        <Text style={s.reqDetails} numberOfLines={1}>{item.details}</Text>
        <View style={s.reqFooter}>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("حذف الطلب", "هل أنت متأكد؟", [
                { text: "إلغاء", style: "cancel" },
                { text: "حذف", style: "destructive", onPress: () => deleteReqMutation.mutate(item.id) },
              ])
            }
            style={s.deleteBtn}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={s.deleteTxt}>حذف</Text>
          </TouchableOpacity>
          <View style={s.reqMeta}>
            <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
            <Text style={s.metaTxt}>{item.area}</Text>
            <View style={s.dot} />
            <Ionicons
              name={item.timeType === "now" ? "flash" : "calendar-outline"}
              size={12}
              color={colors.mutedForeground}
            />
            <Text style={s.metaTxt}>
              {item.timeType === "now"
                ? "الآن"
                : item.scheduledDateTime
                  ? fmtScheduled(item.scheduledDateTime)
                  : "لاحقاً"}
            </Text>
            {item.customerName && (
              <>
                <View style={s.dot} />
                <Text style={s.metaTxt}>{item.customerName}</Text>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <SafeAreaView edges={["top"]} style={s.headerSafe}>
        <View style={s.headerInner}>
          <TouchableOpacity onPress={handleLogout} style={s.headerAction}>
            <Ionicons name="log-out-outline" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>لوحة الإدارة</Text>
          <TouchableOpacity onPress={() => router.push("/(admin)/users")} style={s.headerAction}>
            <Ionicons name="people-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={requests ?? []}
          keyExtractor={i => String(i.id)}
          renderItem={renderRequest}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => { refetchStats(); refetchReqs(); }}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View>
              <View style={s.statsGrid}>
                {statDefs.map((st, i) => (
                  <View key={i} style={s.statCard}>
                    <View style={[s.statIcon, { backgroundColor: st.color + "18" }]}>
                      <Ionicons name={st.icon as any} size={20} color={st.color} />
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
            <View style={s.empty}>
              <Ionicons name="document-text-outline" size={56} color={colors.border} />
              <Text style={s.emptyTxt}>لا توجد طلبات</Text>
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
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    headerSafe: { backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
    headerInner: {
      paddingHorizontal: 16, paddingVertical: 12,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    },
    headerTitle: { fontSize: 20, fontWeight: "800", color: c.foreground },
    headerAction: { padding: 4 },
    listContent: { padding: 16, paddingBottom: bottomInset + 24 },
    statsGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, marginBottom: 20 },
    statCard: {
      width: "31%", backgroundColor: c.card, borderRadius: 14, borderWidth: 1,
      borderColor: c.border, padding: 14, alignItems: "flex-end",
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    statVal: { fontSize: 24, fontWeight: "800", color: c.foreground },
    statLabel: { fontSize: 11, color: c.mutedForeground, textAlign: "right", marginTop: 2 },
    sectionTitle: { fontSize: 17, fontWeight: "700", color: c.foreground, textAlign: "right", marginBottom: 12 },
    reqCard: {
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border,
      padding: 14, marginBottom: 10,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    reqTop: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 },
    reqLeft: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
    reqCat: { fontSize: 15, fontWeight: "700", color: c.foreground, flex: 1, textAlign: "right" },
    reqAmount: { fontSize: 14, fontWeight: "700", color: c.primary },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusTxt: { fontSize: 11, fontWeight: "700" },
    reqDetails: { fontSize: 13, color: c.mutedForeground, textAlign: "right", marginBottom: 8 },
    reqFooter: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
    deleteBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 4, backgroundColor: "#FEF2F2", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    deleteTxt: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
    reqMeta: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
    metaTxt: { fontSize: 12, color: c.mutedForeground },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: c.mutedForeground },
    empty: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
    emptyTxt: { fontSize: 16, color: c.mutedForeground },
  });
