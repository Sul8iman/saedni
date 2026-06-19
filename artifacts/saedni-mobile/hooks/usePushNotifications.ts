import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { BASE } from "@/contexts/AuthContext";

const PUSH_REGISTERED_KEY = "@saedni/pushRegistered";
const TOKEN_KEY = "@saedni/authToken"; // same key AuthContext uses

// Read auth token exactly like AuthContext's secureGet:
//   1. Try SecureStore first (primary store)
//   2. Fall through to AsyncStorage if SecureStore returns null
async function readAuthToken(): Promise<string | null> {
  let token: string | null = null;
  try {
    token = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {}
  if (token != null) return token;
  try {
    token = await AsyncStorage.getItem(TOKEN_KEY);
  } catch {}
  return token;
}

// ── Register device and get Expo push token ──────────────────────────────────
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    const Notifications = await import("expo-notifications");

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
    return null;
  }
}

// ── Save Expo push token to API ───────────────────────────────────────────────
// Reads auth token from SecureStore first, then AsyncStorage — exactly mirroring
// AuthContext's secureGet. Never relies on session cookies.
export async function savePushTokenToServer(token: string): Promise<void> {
  if (!BASE) return;

  const authToken = await readAuthToken();

  if (!authToken) {
    console.warn("[push] savePushTokenToServer: auth token not found in SecureStore or AsyncStorage — skipping");
    return;
  }

  console.log("[push] savePushTokenToServer: sending PATCH with token", authToken.substring(0, 8) + "…");

  try {
    const res = await fetch(`${BASE}/api/auth/push-token`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({ expoPushToken: token }),
    });

    console.log("[push] savePushTokenToServer: response status", res.status);

    if (res.status === 401) {
      const body = await res.text().catch(() => "");
      console.warn("[push] savePushTokenToServer: 401 Unauthorized —", body,
        "— auth token on device does not match DB. Helper should log out and log in again.");
      return;
    }
    if (!res.ok) {
      console.warn("[push] savePushTokenToServer: unexpected status", res.status);
    }
  } catch (err) {
    console.warn("[push] savePushTokenToServer: network error —", err);
  }
}

// ── Hook: register once per helper session ───────────────────────────────────
export function useHelperPushRegistration(isHelper: boolean) {
  const didRun = useRef(false);

  useEffect(() => {
    if (!isHelper || didRun.current) return;
    didRun.current = true;

    (async () => {
      try {
        const expoToken = await registerForPushNotificationsAsync();
        if (!expoToken) return;
        await savePushTokenToServer(expoToken);
        await AsyncStorage.setItem(PUSH_REGISTERED_KEY, expoToken).catch(() => {});
      } catch {}
    })();
  }, [isHelper]);
}
