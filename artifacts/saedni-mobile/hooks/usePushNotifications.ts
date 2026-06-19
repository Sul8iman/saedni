import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { IosAuthorizationStatus } from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE } from "@/contexts/AuthContext";

const PUSH_REGISTERED_KEY = "@saedni/pushRegistered";

// ── Configure foreground notification display ────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Register device and get Expo push token ──────────────────────────────────
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // Android: create notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "ساعدني",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
      });
    }

    const existing = await Notifications.getPermissionsAsync();
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
    return null; // Simulator or permission denied
  }
}

// ── Save token to API ────────────────────────────────────────────────────────
export async function savePushTokenToServer(token: string): Promise<void> {
  if (!BASE) return;
  try {
    await fetch(`${BASE}/api/auth/push-token`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ expoPushToken: token }),
    });
  } catch {}
}

// ── Hook: register once per install and save token ───────────────────────────
export function useHelperPushRegistration(isHelper: boolean) {
  const didRun = useRef(false);

  useEffect(() => {
    if (!isHelper || didRun.current) return;
    didRun.current = true;

    (async () => {
      try {
        const alreadyDone = await AsyncStorage.getItem(PUSH_REGISTERED_KEY).catch(() => null);
        const token = await registerForPushNotificationsAsync();
        if (!token) return;

        await savePushTokenToServer(token);
        if (!alreadyDone) {
          await AsyncStorage.setItem(PUSH_REGISTERED_KEY, token).catch(() => {});
        }
      } catch {}
    })();
  }, [isHelper]);
}
