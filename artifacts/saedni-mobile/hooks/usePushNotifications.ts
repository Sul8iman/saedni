import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE } from "@/contexts/AuthContext";

const PUSH_REGISTERED_KEY = "@saedni/pushRegistered";
const TOKEN_KEY = "@saedni/authToken"; // same key AuthContext uses

// ── Register device and get Expo push token ──────────────────────────────────
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // Dynamically import to avoid module-level native calls at app startup
    const Notifications = await import("expo-notifications");

    // Android: create notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "ساعدني",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    const { IosAuthorizationStatus } = Notifications;
    const isGranted = (p: typeof existing) =>
      p.ios?.status === IosAuthorizationStatus.AUTHORIZED ||
      p.ios?.status === IosAuthorizationStatus.PROVISIONAL;

    let granted = isGranted(existing);
    if (!granted) {
      const result = await Notifications.requestPermissionsAsync();
      granted = isGranted(result);
    }
    if (!granted) return null;

    const tokenObj = await Notifications.getExpoPushTokenAsync({
      projectId: "41abb564-bfc1-4e71-94c3-49e2d4ea642d",
    });
    return tokenObj.data;
  } catch {
    return null; // Simulator, permission denied, or native module unavailable
  }
}

// ── Save token to API ────────────────────────────────────────────────────────
// Must send Authorization: Bearer to survive server restarts (in-memory sessions
// are wiped on restart; Bearer token is looked up from the DB every request).
export async function savePushTokenToServer(token: string): Promise<void> {
  if (!BASE) return;

  // Read the same auth token AuthContext stores
  let authToken: string | null = null;
  try {
    authToken = await AsyncStorage.getItem(TOKEN_KEY);
  } catch {}

  if (!authToken) {
    console.warn("[push] savePushTokenToServer: no auth token in storage — skipping PATCH");
    return;
  }

  try {
    const res = await fetch(`${BASE}/api/auth/push-token`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      credentials: "include",
      body: JSON.stringify({ expoPushToken: token }),
    });

    if (res.status === 401) {
      const body = await res.text();
      console.warn("[push] savePushTokenToServer: 401 Unauthorized —", body);
      return;
    }
    if (!res.ok) {
      console.warn("[push] savePushTokenToServer: unexpected status", res.status);
    }
  } catch (err) {
    console.warn("[push] savePushTokenToServer: network error —", err);
  }
}

// ── Hook: register once after helper login ───────────────────────────────────
export function useHelperPushRegistration(isHelper: boolean) {
  const didRun = useRef(false);

  useEffect(() => {
    if (!isHelper || didRun.current) return;
    didRun.current = true;

    (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (!token) return;
        await savePushTokenToServer(token);
        await AsyncStorage.setItem(PUSH_REGISTERED_KEY, token).catch(() => {});
      } catch {}
    })();
  }, [isHelper]);
}
