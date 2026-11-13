import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Pressable, StyleSheet,
  RefreshControl, ScrollView, Modal,
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
import { getRequestLocationLines } from "@/lib/request-locations";
import { filterGuestRequests, formatRelativePublicationTime } from "@/lib/guest-request-presentation";

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
  isPaused?: boolean | null;
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
  const s = makeStyles(colors);

  const [catFilter, setCatFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [areaGovernorate, setAreaGovernorate] = useState<string | null>(null);
  const [wallVisible, setWallVisible] = useState(false);
  const [wallMessage, setWallMessage] = useState<string | undefined>();
  const [wallIntent, setWallIntent] = useState<"customer" | "helper" | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [filterSheet, setFilterSheet] = useState<"service" | "location" | null>(null);

  const { data: allData, isLoading, isError, refetch, isRefetching } = useListRequests(undefined, {
    query: { queryKey: ["guest-available-requests"] },
  });

  // The public endpoint returns the complete active list; FlatList virtualizes
  // its rendering without paging the data, so this is the full filtered count.
  const requests = filterGuestRequests((allData ?? []) as HelpRequest[], catFilter, areaFilter);

  const catLabel = (v: string) => v === "all" ? "الكل" : CATEGORIES.find(c => c.value === v)?.label ?? v;
  const areaLabel = areaFilter === "all" ? "كل عُمان" : areaFilter;

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

  const renderItem = ({ item }: { item: HelpRequest }) => {
    const locations = getRequestLocationLines(item);
    const executionTime = item.timeType === "now"
      ? "الآن"
      : item.scheduledDateTime
        ? fmtScheduled(item.scheduledDateTime)
        : "لاحقاً";
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`عرض تفاصيل طلب ${catLabel(item.category)}`}
        onPress={() => setSelectedRequest(item)}
        activeOpacity={0.88}
        style={s.card}
      >
        <View style={s.cardTop}>
          <View style={s.catBadge}>
            <Text style={s.catTxt}>{catLabel(item.category)}</Text>
          </View>
          <Text style={s.amount}>
            {item.offeredAmount} <Text style={s.amountCur}>ر.ع.</Text>
          </Text>
        </View>

        <Text style={s.details} numberOfLines={2} ellipsizeMode="tail">{item.details}</Text>

        <View style={s.routeRow}>
          {locations.map((location) => (
            <View style={s.routeItem} key={location.label}>
              <Text style={s.routeLabel}>{location.label}</Text>
              <Text style={s.routeValue}>{location.value}</Text>
            </View>
          ))}
        </View>

        <View style={s.timeRow}>
          <Ionicons name={item.timeType === "now" ? "flash-outline" : "calendar-outline"} size={14} color={colors.mutedForeground} />
          <Text style={s.metaTxt}>
            <Text style={s.metaLabel}>موعد التنفيذ: </Text>{executionTime}
          </Text>
        </View>

        <View style={s.cardBottom}>
          <Text style={s.publishTxt}>{formatRelativePublicationTime(item.createdAt)}</Text>
          <View style={s.detailsLink}>
            <Text style={s.detailsLinkText}>عرض التفاصيل</Text>
            <Ionicons name="chevron-back" size={15} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <SafeAreaView edges={["top"]} style={s.headerSafe}>
        <View style={s.headerInner}>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>الطلبات المتاحة</Text>
            {!isLoading && !isError && (
              <View style={s.countBadge}>
                <Text style={s.countTxt}>{requests.length}</Text>
              </View>
            )}
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
              <Text style={s.loginBtnTxt}>تسجيل الدخول</Text>
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>

      <View style={s.filterRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`الخدمة: ${catLabel(catFilter)}`}
          onPress={() => setFilterSheet("service")}
          activeOpacity={0.8}
          style={s.filterControl}
        >
          <Text style={s.filterLabel}>الخدمة</Text>
          <View style={s.filterValueRow}>
            <Ionicons name="chevron-down" size={15} color={colors.primary} />
            <Text style={s.filterValue}>{catLabel(catFilter)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`الموقع: ${areaLabel}`}
          onPress={() => setFilterSheet("location")}
          activeOpacity={0.8}
          style={s.filterControl}
        >
          <Text style={s.filterLabel}>الموقع</Text>
          <View style={s.filterValueRow}>
            <Ionicons name="chevron-down" size={15} color={colors.primary} />
            <Text style={s.filterValue}>{areaLabel}</Text>
          </View>
        </TouchableOpacity>
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
          data={requests}
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

      <View style={[s.mainActions, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityLabel="إجراءات ساعدني">
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
        visible={filterSheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterSheet(null)}
      >
        <View style={s.sheetOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إغلاق الفلاتر"
            onPress={() => setFilterSheet(null)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[s.filterSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={s.detailHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>
                {filterSheet === "service" ? "اختر الخدمة" : "اختر الموقع"}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="إغلاق"
                onPress={() => setFilterSheet(null)}
                hitSlop={8}
                style={s.closeIcon}
              >
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={s.sheetScroll}
              contentContainerStyle={s.sheetOptions}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filterSheet === "service" ? CAT_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: catFilter === filter.value }}
                  onPress={() => {
                    setCatFilter(filter.value);
                    setFilterSheet(null);
                  }}
                  style={s.sheetOption}
                >
                  <Ionicons
                    name={catFilter === filter.value ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={catFilter === filter.value ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={s.sheetOptionText}>{filter.label}</Text>
                </TouchableOpacity>
              )) : (
                <>
                  <TouchableOpacity
                    accessibilityRole="radio"
                    accessibilityState={{ selected: areaFilter === "all" }}
                    onPress={() => {
                      setAreaFilter("all");
                      setAreaGovernorate(null);
                      setFilterSheet(null);
                    }}
                    style={s.sheetOption}
                  >
                    <Ionicons
                      name={areaFilter === "all" ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={areaFilter === "all" ? colors.primary : colors.mutedForeground}
                    />
                    <Text style={s.sheetOptionText}>كل عُمان</Text>
                  </TouchableOpacity>
                  {OMAN_LOCATION_CATALOG.map(({ governorate, locations }) => {
                    const expanded = areaGovernorate === governorate;
                    return (
                      <View key={governorate}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityState={{ expanded }}
                          onPress={() => setAreaGovernorate(expanded ? null : governorate)}
                          style={s.governorateOption}
                        >
                          <Ionicons
                            name={expanded ? "chevron-up" : "chevron-down"}
                            size={17}
                            color={colors.mutedForeground}
                          />
                          <Text style={s.governorateText}>{governorate}</Text>
                        </TouchableOpacity>
                        {expanded && locations.map((area) => (
                          <TouchableOpacity
                            key={area}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: areaFilter === area }}
                            onPress={() => {
                              setAreaFilter(areaFilter === area ? "all" : area);
                              setFilterSheet(null);
                            }}
                            style={s.areaOption}
                          >
                            <Ionicons
                              name={areaFilter === area ? "checkmark-circle" : "ellipse-outline"}
                              size={19}
                              color={areaFilter === area ? colors.primary : colors.mutedForeground}
                            />
                            <Text style={s.sheetOptionText}>{area}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!selectedRequest}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <View style={s.detailOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إغلاق تفاصيل الطلب"
            onPress={() => setSelectedRequest(null)}
            style={StyleSheet.absoluteFill}
          />
          <View style={[s.detailSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={s.detailHandle} />
            <ScrollView
              style={s.detailScroll}
              contentContainerStyle={s.detailContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.detailTitle}>
                {selectedRequest ? catLabel(selectedRequest.category) : ""}
              </Text>
              <Text style={s.detailDescription}>{selectedRequest?.details}</Text>
              {selectedRequest && getRequestLocationLines(selectedRequest).map(location => (
                <Text key={location.label} style={s.detailMeta}>{location.label}: {location.value}</Text>
              ))}
              <Text style={s.detailMeta}>
                موعد التنفيذ: {selectedRequest?.timeType === "now"
                  ? "الآن"
                  : selectedRequest?.scheduledDateTime
                    ? fmtScheduled(selectedRequest.scheduledDateTime)
                    : "لاحقاً"}
              </Text>
              <Text style={s.detailMeta}>المبلغ المقترح: {selectedRequest?.offeredAmount} ر.ع.</Text>
              <Text style={s.detailMeta}>
                تاريخ ووقت النشر: {selectedRequest ? fmtCreatedAt(selectedRequest.createdAt) : ""}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={s.lockedBtn}
              onPress={() => {
                setSelectedRequest(null);
                showWall("سجّل الدخول أو أنشئ حساباً للتواصل مع صاحب الطلب", "helper");
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
              <Text style={s.lockedBtnTxt}>تسجيل الدخول للتواصل</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedRequest(null)} style={s.detailClose}>
              <Text style={s.detailCloseText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    headerSafe: { backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
    headerInner: {
      minHeight: 52, paddingHorizontal: 14, paddingVertical: 6,
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8,
    },
    headerRight: { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 8 },
    headerTitle: { flexShrink: 1, fontSize: 19, fontWeight: "800", color: c.foreground },
    countBadge: { backgroundColor: c.secondary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    countTxt: { fontSize: 13, fontWeight: "700", color: c.primary },
    headerActions: { flexDirection: "row-reverse" },
    loginBtn: {
      minHeight: 44, justifyContent: "center", backgroundColor: c.primary,
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
    },
    loginBtnTxt: { color: c.primaryForeground, fontSize: 13, fontWeight: "700" },

    filterRow: {
      flexDirection: "row-reverse", gap: 8, paddingHorizontal: 12, paddingVertical: 8,
      backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    filterControl: {
      flex: 1, minWidth: 0, minHeight: 52, justifyContent: "center", alignItems: "flex-end",
      borderRadius: 11, borderWidth: 1, borderColor: c.border, backgroundColor: c.background,
      paddingHorizontal: 10, paddingVertical: 6,
    },
    filterLabel: { fontSize: 12, color: c.mutedForeground, fontWeight: "600", textAlign: "right" },
    filterValueRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
    filterValue: { flexShrink: 1, fontSize: 14, color: c.foreground, fontWeight: "700", textAlign: "right" },

    skeletonList: { flex: 1, padding: 12, gap: 8 },
    skeletonCard: { padding: 14, gap: 12, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 14 },
    skeletonLineWide: { height: 18, width: "68%", alignSelf: "flex-end", borderRadius: 8, backgroundColor: c.muted },
    skeletonLine: { height: 14, width: "92%", alignSelf: "flex-end", borderRadius: 7, backgroundColor: c.muted },
    skeletonLineShort: { height: 14, width: "48%", alignSelf: "flex-end", borderRadius: 7, backgroundColor: c.muted },
    listContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, flexGrow: 1 },
    card: {
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border,
      padding: 12, marginBottom: 8, gap: 6,
      shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    cardTop: {
      flexDirection: "row-reverse", alignItems: "center",
      justifyContent: "space-between", gap: 8,
    },
    catBadge: {
      backgroundColor: c.secondary, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
      flexShrink: 1, maxWidth: "70%",
    },
    catTxt: { fontSize: 14, fontWeight: "700", color: c.primary, textAlign: "right" },
    amount: { fontSize: 19, fontWeight: "800", color: c.primary },
    amountCur: { fontSize: 13, fontWeight: "600" },
    details: {
      fontSize: 15, color: c.foreground, textAlign: "right",
      lineHeight: 21, marginBottom: 1,
    },
    routeRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 },
    routeItem: { flexDirection: "row-reverse", alignItems: "center", gap: 4, flexShrink: 1 },
    routeLabel: { fontSize: 13, color: c.mutedForeground, fontWeight: "700" },
    routeValue: { flexShrink: 1, fontSize: 14, color: c.foreground, fontWeight: "600" },
    timeRow: { flexDirection: "row-reverse", alignItems: "center", gap: 5, flexWrap: "wrap" },
    metaTxt: { fontSize: 14, color: c.mutedForeground, fontWeight: "500", textAlign: "right" },
    metaLabel: { color: c.foreground, fontWeight: "700" },
    cardBottom: {
      flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 4, paddingTop: 2,
    },
    publishTxt: { fontSize: 13, color: c.mutedForeground, fontWeight: "600", textAlign: "right" },
    detailsLink: { flexDirection: "row-reverse", alignItems: "center", gap: 3 },
    detailsLinkText: { color: c.primary, fontSize: 14, fontWeight: "700" },

    empty: { alignItems: "center", justifyContent: "center", paddingTop: 56, paddingHorizontal: 16, gap: 10 },
    errorState: { flex: 1, paddingHorizontal: 24, paddingTop: 0 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: c.foreground, textAlign: "center" },
    emptyHint: { fontSize: 14, color: c.mutedForeground, textAlign: "center", lineHeight: 22 },
    retryBtn: { minHeight: 44, justifyContent: "center", marginTop: 8, backgroundColor: c.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
    retryTxt: { color: c.primaryForeground, fontSize: 14, fontWeight: "700" },

    mainActions: {
      flexDirection: "row-reverse", paddingHorizontal: 12, paddingTop: 8, gap: 8,
      backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border,
    },
    mainPrimary: { flex: 1, minHeight: 50, borderRadius: 13, backgroundColor: c.primary, justifyContent: "center", alignItems: "center", paddingHorizontal: 8 },
    mainPrimaryText: { color: c.primaryForeground, fontSize: 15, fontWeight: "800", textAlign: "center" },
    mainSecondary: { flex: 1, minHeight: 50, borderRadius: 13, borderWidth: 1.5, borderColor: c.primary, justifyContent: "center", alignItems: "center", backgroundColor: c.card, paddingHorizontal: 8 },
    mainSecondaryText: { color: c.primary, fontSize: 15, fontWeight: "700", textAlign: "center" },

    sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
    filterSheet: {
      maxHeight: "82%", backgroundColor: c.background, borderTopLeftRadius: 22,
      borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 12,
    },
    sheetHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", minHeight: 48 },
    sheetTitle: { fontSize: 19, color: c.foreground, fontWeight: "800", textAlign: "right" },
    closeIcon: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
    sheetScroll: { flexShrink: 1 },
    sheetOptions: { paddingBottom: 8 },
    sheetOption: {
      minHeight: 48, flexDirection: "row-reverse", alignItems: "center", gap: 12,
      borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: 10,
    },
    sheetOptionText: { flex: 1, fontSize: 16, color: c.foreground, textAlign: "right" },
    governorateOption: {
      minHeight: 48, flexDirection: "row-reverse", alignItems: "center", gap: 8,
      backgroundColor: c.muted, borderRadius: 10, marginTop: 8, paddingHorizontal: 10, paddingVertical: 8,
    },
    governorateText: { flex: 1, fontSize: 15, color: c.foreground, fontWeight: "700", textAlign: "right" },
    areaOption: {
      minHeight: 46, flexDirection: "row-reverse", alignItems: "center", gap: 10,
      paddingHorizontal: 14, paddingVertical: 8,
    },

    detailOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
    detailSheet: {
      maxHeight: "88%", backgroundColor: c.background, borderTopLeftRadius: 24,
      borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 14, gap: 8,
    },
    detailHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: 4 },
    detailScroll: { flexShrink: 1 },
    detailContent: { gap: 12, paddingBottom: 8 },
    detailTitle: { fontSize: 21, color: c.foreground, fontWeight: "800", textAlign: "right" },
    detailDescription: { fontSize: 16, color: c.foreground, lineHeight: 25, textAlign: "right" },
    detailMeta: { fontSize: 15, color: c.mutedForeground, textAlign: "right", lineHeight: 22 },
    lockedBtn: {
      minHeight: 48, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: c.muted, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10,
      borderWidth: 1, borderColor: c.border,
    },
    lockedBtnTxt: { fontSize: 14, color: c.mutedForeground, fontWeight: "600", textAlign: "center" },
    detailClose: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
    detailCloseText: { color: c.mutedForeground, fontSize: 15, fontWeight: "700" },
  });
