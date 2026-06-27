import { androidBridge } from "./android-bridge";
import { isNativeApp, getNativePlatform } from "./native-app";
import { TcallPermissions } from "./tcall-permissions-plugin";

async function withPlugin<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!isNativeApp()) return fallback;
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function checkNativeMicPermission(): Promise<boolean> {
  if (isNativeApp() && getNativePlatform() === "android" && androidBridge()) {
    return false;
  }
  return withPlugin(async () => {
    const r = await TcallPermissions.checkMicrophone();
    return r.granted;
  }, false);
}

/** Foydalanuvchi bosishidan keyin chaqiring — Android tizim dialogi */
export async function ensureNativeMicPermission(): Promise<boolean> {
  if (!isNativeApp()) return true;
  if (getNativePlatform() === "ios") return true;
  if (androidBridge()) return true;
  return withPlugin(async () => {
    const current = await TcallPermissions.checkMicrophone();
    if (current.granted) return true;
    const r = await TcallPermissions.requestMicrophone();
    return r.granted;
  }, false);
}

export async function ensureNativeCameraPermission(): Promise<boolean> {
  if (!isNativeApp()) return true;
  if (getNativePlatform() === "ios") return true;
  return withPlugin(async () => {
    const current = await TcallPermissions.checkCamera();
    if (current.granted) return true;
    const r = await TcallPermissions.requestCamera();
    return r.granted;
  }, false);
}

export async function ensureNativeNotificationPermission(): Promise<boolean> {
  if (!isNativeApp()) return false;
  if (getNativePlatform() === "ios") {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const local = await LocalNotifications.requestPermissions();
      return local.display === "granted";
    } catch {
      return false;
    }
  }
  return withPlugin(async () => {
    const current = await TcallPermissions.checkNotifications();
    if (current.granted) return true;
    const r = await TcallPermissions.requestNotifications();
    return r.granted;
  }, false);
}
