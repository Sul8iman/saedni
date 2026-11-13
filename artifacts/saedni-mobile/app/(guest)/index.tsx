import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView, Modal, TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useListRequests } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES } from "@/constants/categories";
import { OMAN_LOCATION_CATALOG } from "../../../../lib/api-zod/location-catalog";
import GuestWall from "@/components/GuestWall";
import { getRequestLocationLines, requestMatchesArea } from "@/lib/request-locations";

interface HelpRequest {
  id: number;
  category: string;
  details: string;
  area: string;
  fromArea?: string | null;
  toArea?: string | null;
  timeType: string;
  scheduledDateTime?: string | null;
  offeredAmount: number;
  status: string;
  createdAt: string;
}

function fmtCreatedAt(iso: string | null | undefined): string {
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
  return fmtCreatedAt(iso);
}

const CAT_FILTERS = [
  { value: "all", label: "الكل" },
  ...CATEGORIES.map(c => ({ value: c.value, label: c.label })),
];

export default function GuestBrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, exitGuestMode, setActiveRole } = useAuth();
  const s = makeStyles(colors, insets.bottom);

  const [catFilter, setCatFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [areaGovernorate, setAreaGovernorate] = useState<string | null>(null);
  const [wallVisible, setWallVisible] = useState(false);
  const [wallMessage, setWallMessage] = useState<string | undefined>();
  const [wallIntent, setWallIntent] = useState<"customer" | "helper" | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);

  const { data: allData, isLoading, isError, refetch, isRefetching } = useListRequests(undefined, {
    query: { queryKey: ["guest-available-requests"] },
  });

  const data = (allData ?? [])
    .filter(item => item.status === "available")
    .filter(item => {
    const catMatch = catFilter === "all" || item.category === catFilter;
    const areaMatch = areaFilter === "all" || requestMatchesArea(item, areaFilter);
    return catMatch && areaMatch;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v;

  function showWall(msg?: string, intent: "customer" | "helper" | null = null) {
    setWallMessage(msg);
    setWallIntent(intent);
    setWallVisible(true);
  }

  function handleIntent(intent: "customer" | "helper") {
    if (user) {
      void setActiveRole(intent).then(() => {
        router.replace(intent === "customer" ? "/(customer)" : "/(helper)");
      });
      return;
    }
    showWall(undefined, intent);
  }

  function handleLogin() {
    exitGuestMode();
    router.replace("/(auth)/login");
  }

  function handleRegister() {
    exitGuestMode();
    router.replace("/(auth)/register");
  }

  const renderItem = ({ item }: { item: HelpRequest }) => (
    <View style={s.card}>
      {/* Top: category + amount */}
      <View style={s.cardTop}>
        <Text style={s.amount}>
          {item.offeredAmount}{" "}
          <Text style={s.amountCur}>ر.ع.</Text>
        </Text>
        <View style={s.catBadge}>
          <Text style={s.catTxt}>{catLabel(item.category)}</Text>
        </View>
      </View>

      {/* Details */}
      <Text style={s.details}>{item.details}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => setSelectedRequest(item)}
        style={s.detailsLink}
        activeOpacity={0.75}
      >
        <Text style={s.detailsLinkText}>عرض التفاصيل</Text>
        <Ionicons name="chevron-back" size={15} color={colors.primary} />
      </TouchableOpacity>

      {/* Meta chips */}
      <View style={s.metaRow}>
        {getRequestLocationLines(item).map((location) => (
          <View style={s.metaChip} key={location.label}>
            <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
            <Text style={s.metaTxt}>{location.label}: {location.value}</Text>
          </View>
        ))}
        <View style={s.metaChip}>
          <Ionicons
            name={item.timeType === "now" ? "flash" : "calendar-outline"}
            size={13}
            color={colors.mutedForeground}
          />
          <Text style={s.metaTxt}>
            {item.timeType === "now"
              ? "الآن"
              : item.scheduledDateTime
                ? fmtScheduled(item.scheduledDateTime)
                : "لاحقاً"}
          </Text>
        </View>
      </View>

      {/* Publish date */}
      <View style={s.publishRow}>
        <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
        <Text style={s.publishTxt}>
          {"تاريخ نشر الطلب: "}
          <Text style={s.publishVal}>{fmtCreatedAt(item.createdAt)}</Text>
        </Text>
      </View>
      <View style={s.statusBadge}>
        <View style={s.statusDot} />
        <Text style={s.statusText}>متاح</Text>
      </View>

      {/* Locked contact action */}
      <TouchableOpacity
        style={s.lockedBtn}
        onPress={() => showWall("سجّل الدخول أو أنشئ حساباً للتواصل مع صاحب الطلب")}
        activeOpacity={0.85}
      >
        <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
        <Text style={s.lockedBtnTxt}>سجّل الدخول للتواصل مع صاحب الطلب</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <SafeAreaView edges={["top"]} style={s.headerSafe}>
        <View style={s.headerInner}>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>تصفح الطلبات</Text>
            {!isLoading && !isError && (
              <View style={s.countBadge}>
                <Text style={s.countTxt}>{data.length}</Text>
              </View>
            )}
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
              <Text style={s.loginBtnTxt}>تسجيل الدخول</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Guest banner */}
        <TouchableOpacity style={s.guestBanner} onPress={() => showWall()} activeOpacity={0.85}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={s.guestBannerTxt}>
            أنت تتصفح كضيف — سجّل الدخول للتواصل مع أصحاب الطلبات
          </Text>
          <Ionicons name="chevron-back" size={14} color={colors.primary} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Filter: نوع المهمة */}
      <View style={s.filterSection}>
        <Text style={s.filterLabel}>نوع المهمة</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
        >
          {CAT_FILTERS.map(f => (
            <TouchableOpacity
              key={f.value}
              style={[s.chip, catFilter === f.value && s.chipActive]}
              onPress={() => setCatFilter(f.value)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipTxt, catFilter === f.value && s.chipTxtActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Filter: الموقع */}
      <View style={[s.filterSection, s.filterSectionBorder]}>
        <Text style={s.filterLabel}>الموقع</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
        >
          <TouchableOpacity
            style={[s.chip, areaFilter === "all" && s.chipActive]}
            onPress={() => { setAreaFilter("all"); setAreaGovernorate(null); }}
            activeOpacity={0.8}
          >
            <Text style={[s.chipTxt, areaFilter === "all" && s.chipTxtActive]}>كل عُمان</Text>
          </TouchableOpacity>
          {OMAN_LOCATION_CATALOG.map(({ governorate }) => (
            <TouchableOpacity
              key={governorate}
              style={[s.chip, areaGovernorate === governorate && s.chipActive]}
              onPress={() => setAreaGovernorate(governorate)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipTxt, areaGovernorate === governorate && s.chipTxtActive]}>{governorate}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {areaGovernorate && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
            {OMAN_LOCATION_CATALOG.find(({ governorate }) => governorate === areaGovernorate)?.locations.map((area) => (
              <TouchableOpacity
                key={area}
                style={[s.chip, areaFilter === area && s.chipActive]}
                onPress={() => setAreaFilter(areaFilter === area ? "all" : area)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipTxt, areaFilter === area && s.chipTxtActive]}>{area}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={s.skeletonList} accessibilityLabel="جاري تحميل الطلبات">
          {[0, 1, 2].map(index => (
            <View key={index} style={s.skeletonCard}>
              <View style={s.skeletonLineWide} />
              <View style={s.skeletonLine} />
              <View style={s.skeletonLineShort} />
            </View>
          ))}
        </View>
      ) : isError ? (
        <View style={[s.empty, s.errorState]}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>تعذر تحميل الطلبات</Text>
          <Text style={s.emptyHint}>تحقق من اتصال الإنترنت وحاول مرة أخرى</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => { void refetch(); }}
            activeOpacity={0.85}
          >
            <Text style={s.retryTxt}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="search-outline" size={56} color={colors.border} />
              <Text style={s.emptyTitle}>لا توجد طلبات</Text>
              <Text style={s.emptyHint}>
                {catFilter !== "all" || areaFilter !== "all"
                  ? "لا توجد طلبات تطابق الفلتر المحدد"
                  : "ارجع لاحقاً للاطلاع على الطلبات الجديدة"}
              </Text>
            </View>
          }
        />
      )}

      <View style={[s.mainActions, { paddingBottom: Math.max(insets.bottom, 12) }]} accessibilityLabel="إجراءات ساعدني">
        <TouchableOpacity
          testID="guest-request-help"
          style={s.mainPrimary}
          onPress={() => handleIntent("customer")}
          activeOpacity={0.85}
        >
          <Text style={s.mainPrimaryText}>اطلب مساعدة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="guest-help-others"
          style={s.mainSecondary}
          onPress={() => handleIntent("helper")}
          activeOpacity={0.85}
        >
          <Text style={s.mainSecondaryText}>ساعد الآخرين</Text>
        </TouchableOpacity>
      </View>

      <GuestWall
        visible={wallVisible}
        onClose={() => setWallVisible(false)}
        message={wallMessage}
        intent={wallIntent}
      />
      <Modal
        visible={!!selectedRequest}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedRequest(null)}>
          <View style={s.detailOverlay}>
            <TouchableWithoutFeedback>
              <View style={s.detailSheet}>
                <View style={s.detailHandle} />
                <Text style={s.detailTitle}>
                  {selectedRequest ? catLabel(selectedRequest.category) : ""}
                </Text>
                <Text style={s.detailDescription}>{selectedRequest?.details}</Text>
                {selectedRequest && getRequestLocationLines(selectedRequest).map(location => (
                  <Text key={location.label} style={s.detailMeta}>{location.label}: {location.value}</Text>
                ))}
                <Text style={s.detailMeta}>
                  {selectedRequest?.timeType === "now"
                    ? "الوقت: الآن"
                    : `الوقت: ${selectedRequest?.scheduledDateTime ? fmtScheduled(selectedRequest.scheduledDateTime) : "لاحقاً"}`}
                </Text>
                <Text style={s.detailMeta}>المبلغ المقترح: {selectedRequest?.offeredAmount} ر.ع.</Text>
                <Text style={s.detailMeta}>
                  تاريخ النشر: {selectedRequest ? fmtCreatedAt(selectedRequest.createdAt) : ""}
                </Text>
                <Text style={s.detailMeta}>الحالة: متاح</Text>
                <TouchableOpacity
                  style={s.lockedBtn}
                  onPress={() => {
                    setSelectedRequest(null);
                    showWall("سجّل الدخول أو أنشئ حساباً للتواصل مع صاحب الطلب");
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
                  <Text style={s.lockedBtnTxt}>سجّل الدخول للتواصل مع صاحب الطلب</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSelectedRequest(null)} style={s.detailClose}>
                  <Text style={s.detailCloseText}>إغلاق</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>, bottomInset: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },

    headerSafe: { backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
    headerInner: {
      paddingHorizontal: 16, paddingVertical: 12,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    },
    headerRight: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
    headerTitle: { fontSize: 20, fontWeight: "800", color: c.foreground },
    countBadge: {
      backgroundColor: c.secondary, borderRadius: 10,
      paddingHorizontal: 8, paddingVertical: 2,
    },
    countTxt: { fontSize: 12, fontWeight: "700", color: c.primary },
    headerActions: { flexDirection: "row-reverse", gap: 8 },
    loginBtn: {
      backgroundColor: c.primary, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 8,
    },
    loginBtnTxt: { color: c.primaryForeground, fontSize: 13, fontWeight: "700" },

    guestBanner: {
      flexDirection: "row-reverse", alignItems: "center", gap: 8,
      backgroundColor: c.secondary,
      paddingHorizontal: 16, paddingVertical: 10,
      borderTopWidth: 1, borderTopColor: c.border,
    },
    guestBannerTxt: {
      flex: 1, fontSize: 12, color: c.primary,
      fontWeight: "600", textAlign: "right",
    },

    filterSection: { backgroundColor: c.card, paddingTop: 10, paddingBottom: 10 },
    filterSectionBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    filterLabel: {
      fontSize: 12, fontWeight: "700", color: c.mutedForeground,
      textAlign: "right", paddingHorizontal: 16, marginBottom: 6,
    },
    chipsRow: { paddingHorizontal: 16, flexDirection: "row-reverse", gap: 8 },
    chip: {
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
      borderWidth: 1.5, borderColor: c.border, backgroundColor: c.background,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipTxt: { fontSize: 13, color: c.mutedForeground, fontWeight: "600" },
    chipTxtActive: { color: c.primaryForeground, fontWeight: "700" },

    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    skeletonList: { flex: 1, padding: 16, gap: 12 },
    skeletonCard: { padding: 18, gap: 14, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 16 },
    skeletonLineWide: { height: 18, width: "68%", alignSelf: "flex-end", borderRadius: 8, backgroundColor: c.muted },
    skeletonLine: { height: 14, width: "92%", alignSelf: "flex-end", borderRadius: 7, backgroundColor: c.muted },
    skeletonLineShort: { height: 14, width: "48%", alignSelf: "flex-end", borderRadius: 7, backgroundColor: c.muted },
    listContent: { padding: 16, paddingBottom: 24 },
    statusBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: 12, backgroundColor: c.secondary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
    statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.primary },
    statusText: { fontSize: 12, color: c.primary, fontWeight: "700" },

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
    catBadge: {
      backgroundColor: c.secondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
      flexShrink: 1, maxWidth: "60%",
    },
    catTxt: { fontSize: 13, fontWeight: "700", color: c.primary, textAlign: "right" },
    amount: { fontSize: 22, fontWeight: "800", color: c.primary },
    amountCur: { fontSize: 14, fontWeight: "600" },
    details: {
      fontSize: 14, color: c.mutedForeground, textAlign: "right",
      lineHeight: 21, marginBottom: 12,
    },
    publishRow: { flexDirection: "row-reverse", alignItems: "center", gap: 5, marginBottom: 12 },
    publishTxt: { fontSize: 11, color: c.mutedForeground, textAlign: "right" },
    publishVal: { fontSize: 11, color: c.foreground, fontWeight: "600" },
    metaRow: { flexDirection: "row-reverse", gap: 8, marginBottom: 12, flexWrap: "wrap" },
    metaChip: {
      flexDirection: "row-reverse", alignItems: "center", gap: 4,
      backgroundColor: c.muted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    },
    metaTxt: { fontSize: 12, color: c.mutedForeground, fontWeight: "500" },

    lockedBtn: {
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: c.muted, borderRadius: 10, paddingVertical: 11,
      borderWidth: 1, borderColor: c.border,
    },
    lockedBtnTxt: { fontSize: 13, color: c.mutedForeground, fontWeight: "600" },

    empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
    errorState: { flex: 1, paddingHorizontal: 24, paddingTop: 0 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: c.foreground },
    emptyHint: { fontSize: 14, color: c.mutedForeground, textAlign: "center", lineHeight: 22 },
    retryBtn: { marginTop: 8, backgroundColor: c.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
    retryTxt: { color: c.primaryForeground, fontSize: 14, fontWeight: "700" },

    mainActions: { paddingHorizontal: 16, paddingTop: 10, gap: 8, backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border },
    mainPrimary: { minHeight: 48, borderRadius: 13, backgroundColor: c.primary, justifyContent: "center", alignItems: "center" },
    mainPrimaryText: { color: c.primaryForeground, fontSize: 15, fontWeight: "800" },
    mainSecondary: { minHeight: 46, borderRadius: 13, borderWidth: 1.5, borderColor: c.primary, justifyContent: "center", alignItems: "center", backgroundColor: c.card },
    mainSecondaryText: { color: c.primary, fontSize: 15, fontWeight: "700" },
    detailsLink: { flexDirection: "row-reverse", alignItems: "center", gap: 4, alignSelf: "flex-start", marginBottom: 10 },
    detailsLinkText: { color: c.primary, fontSize: 13, fontWeight: "700" },
    detailOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
    detailSheet: { backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 32, gap: 12 },
    detailHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: 6 },
    detailTitle: { fontSize: 20, color: c.foreground, fontWeight: "800", textAlign: "right" },
    detailDescription: { fontSize: 15, color: c.foreground, lineHeight: 24, textAlign: "right" },
    detailMeta: { fontSize: 14, color: c.mutedForeground, textAlign: "right" },
    detailClose: { alignItems: "center", paddingVertical: 10 },
    detailCloseText: { color: c.mutedForeground, fontSize: 14, fontWeight: "700" },
  });
