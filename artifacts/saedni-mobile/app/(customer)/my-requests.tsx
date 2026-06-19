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
  scheduledDateTime?: string | null;
  offeredAmount: number;
  status: string;
  createdAt: string;
  customerPhone?: string | null;
  helpCompleted?: boolean | null;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "غير متوفر";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "غير متوفر";
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const min = d.getMinutes().toString().padStart(2, "0");
  const period = h >= 12 ? "مساءً" : "صباحاً";
  h = h % 12 || 12;
  return `${dd}/${mm}/${yyyy} - ${h}:${min} ${period}`;
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

  const endMutation = useMutation({
    mutationFn: ({ id, helpCompleted }: { id: number; helpCompleted: boolean }) =>
      fetch(`${BASE}/api/requests/${id}/complete`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpCompleted }),
      }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["my-requests", user?.id] });
    },
    onError: () => Alert.alert("خطأ", "تعذر إنهاء الطلب"),
  });

  const confirmEnd = useCallback((id: number) => {
    Alert.alert(
      "هل تمت المساعدة؟",
      "",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "لا",
          style: "destructive",
          onPress: () => endMutation.mutate({ id, helpCompleted: false }),
        },
        {
          text: "نعم",
          onPress: () => endMutation.mutate({ id, helpCompleted: true }),
        },
      ]
    );
  }, [endMutation]);

  const catLabel = useCallback((v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v, []);
  const s = makeStyles(colors, insets.bottom);

  const renderItem = ({ item }: { item: HelpRequest }) => {
    const st = STATUS_INFO[item.status] ?? { label: item.status, color: "#6B7280", bg: "#F3F4F6" };
    const isActive = item.status === "available" || item.status === "accepted" || item.status === "in_progress";

    return (
      <View style={s.card}>
        <View style={s.cardTopRow}>
          <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
            <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
          </View>
          <Text style={s.catLabel}>{catLabel(item.category)}</Text>
        </View>

        <Text style={s.details}>{item.details}</Text>

        <View style={s.infoGrid}>
          <View style={s.infoRow}>
            <Text style={s.infoVal}>{item.area}</Text>
            <Text style={s.infoKey}>الموقع</Text>
            <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
          </View>

          <View style={s.infoRow}>
            <Text style={s.infoVal}>
              {item.timeType === "now"
                ? "الآن"
                : item.scheduledDateTime
                  ? fmtScheduled(item.scheduledDateTime)
                  : "لاحقاً"}
            </Text>
            <Text style={s.infoKey}>الوقت</Text>
            <Ionicons
              name={item.timeType === "now" ? "flash" : "calendar-outline"}
              size={14}
              color={colors.mutedForeground}
            />
          </View>

          <View style={s.infoRow}>
            <Text style={[s.infoVal, s.amountVal]}>{item.offeredAmount} ر.ع.</Text>
            <Text style={s.infoKey}>المبلغ</Text>
            <Ionicons name="cash-outline" size={14} color={colors.mutedForeground} />
          </View>

          {item.customerPhone && (
            <View style={s.infoRow}>
              <Text style={s.infoVal}>{item.customerPhone}</Text>
              <Text style={s.infoKey}>رقم الهاتف</Text>
              <Ionicons name="call-outline" size={14} color={colors.mutedForeground} />
            </View>
          )}

          <View style={s.infoRow}>
            <Text style={s.infoVal}>{fmtDate(item.createdAt)}</Text>
            <Text style={s.infoKey}>تاريخ نشر الطلب</Text>
            <Ionicons name="calendar-clear-outline" size={14} color={colors.mutedForeground} />
          </View>

          {/* Feedback badge for completed requests */}
          {item.status === "completed" && item.helpCompleted !== null && item.helpCompleted !== undefined && (
            <View style={s.infoRow}>
              <View style={[s.feedbackBadge, item.helpCompleted ? s.feedbackYes : s.feedbackNo]}>
                <Ionicons
                  name={item.helpCompleted ? "checkmark-circle" : "close-circle"}
                  size={13}
                  color={item.helpCompleted ? "#059669" : "#DC2626"}
                />
                <Text style={[s.feedbackTxt, { color: item.helpCompleted ? "#059669" : "#DC2626" }]}>
                  {item.helpCompleted ? "تمت المساعدة" : "لم تتم المساعدة"}
                </Text>
              </View>
              <Text style={s.infoKey}>التقييم</Text>
              <Ionicons name="star-outline" size={14} color={colors.mutedForeground} />
            </View>
          )}
        </View>

        {isActive && (
          <TouchableOpacity
            style={s.endBtn}
            onPress={() => confirmEnd(item.id)}
            activeOpacity={0.8}
            disabled={endMutation.isPending}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
            <Text style={s.endTxt}>إنهاء الطلب</Text>
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
      padding: 16, marginBottom: 14,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    cardTopRow: {
      flexDirection: "row-reverse", alignItems: "center",
      justifyContent: "space-between", marginBottom: 10,
    },
    statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    statusTxt: { fontSize: 12, fontWeight: "700" },
    catLabel: { fontSize: 16, fontWeight: "800", color: c.foreground },
    details: {
      fontSize: 14, color: c.mutedForeground, textAlign: "right",
      lineHeight: 22, marginBottom: 14,
    },
    infoGrid: {
      backgroundColor: c.muted, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 6, gap: 0, marginBottom: 14,
    },
    infoRow: {
      flexDirection: "row-reverse", alignItems: "center", gap: 8,
      paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
    },
    infoKey: {
      fontSize: 12, color: c.mutedForeground, fontWeight: "600", width: 80, textAlign: "right",
    },
    infoVal: {
      flex: 1, fontSize: 14, color: c.foreground, fontWeight: "500", textAlign: "right",
    },
    amountVal: { color: c.primary, fontWeight: "800", fontSize: 15 },

    feedbackBadge: {
      flexDirection: "row-reverse", alignItems: "center", gap: 4,
      borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flex: 1,
    },
    feedbackYes: { backgroundColor: "#D1FAE5" },
    feedbackNo:  { backgroundColor: "#FEE2E2" },
    feedbackTxt: { fontSize: 12, fontWeight: "700" },

    endBtn: {
      borderWidth: 1.5, borderColor: c.border, borderRadius: 10,
      paddingVertical: 11, flexDirection: "row-reverse", alignItems: "center",
      justifyContent: "center", gap: 6, backgroundColor: c.secondary,
    },
    endTxt: { color: c.primary, fontSize: 14, fontWeight: "700" },

    empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: c.foreground },
    emptyHint: { fontSize: 14, color: c.mutedForeground, textAlign: "center" },
  });
