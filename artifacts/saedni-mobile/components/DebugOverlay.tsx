import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
} from "react-native";
import { useAuth, BASE } from "@/contexts/AuthContext";

const BUILD_STAMP = "BUILD 6";

export function DebugOverlay() {
  const { user, loading, startupLog } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const badge = (
    <TouchableOpacity
      style={styles.badge}
      onPress={() => setExpanded(!expanded)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.badgeText}>{expanded ? "✕" : "🔍"}</Text>
    </TouchableOpacity>
  );

  if (!expanded) return <View style={styles.root} pointerEvents="box-none">{badge}</View>;

  const tokenLine = loading
    ? "🔑 …checking"
    : startupLog?.tokenFound
      ? `🔑 ✅ ${startupLog.tokenPreview} (${startupLog.storageBackend})`
      : "🔑 ❌ not found";

  const meLine = loading
    ? "📡 …"
    : startupLog?.meStatus === "not-checked" ? "📡 ⏭ skipped (no token)"
    : startupLog?.meStatus === "network-error" ? "📡 🔴 network error"
    : startupLog?.meStatus === 200 ? "📡 ✅ 200 OK"
    : `📡 ❌ ${startupLog?.meStatus}`;

  const userLine = loading
    ? "👤 …"
    : user
      ? `👤 ✅ ${user.name} (${user.userType})`
      : "👤 ❌ not restored";

  const domainLine = `🌐 ${BASE || "⚠️ EMPTY — domain not set"}`;

  return (
    <View style={styles.root} pointerEvents="box-none">
      {badge}
      <View style={styles.panel} pointerEvents="auto">
        <Text style={styles.title}>{BUILD_STAMP}</Text>
        <Text style={styles.line}>{domainLine}</Text>
        <Text style={styles.line}>{tokenLine}</Text>
        <Text style={styles.line}>{meLine}</Text>
        <Text style={styles.line}>{userLine}</Text>
        <Text style={styles.dim}>tap 🔍 to hide</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 56,
    right: 12,
    zIndex: 9999,
    alignItems: "flex-end",
  },
  badge: {
    backgroundColor: "#1f2937",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.85,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 14,
  },
  panel: {
    backgroundColor: "#0d1117",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#30363d",
    minWidth: 240,
    gap: 3,
  },
  title: {
    color: "#f0f6fc",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },
  line: {
    color: "#c9d1d9",
    fontSize: 10,
    lineHeight: 15,
  },
  dim: {
    color: "#484f58",
    fontSize: 9,
    marginTop: 4,
  },
});
