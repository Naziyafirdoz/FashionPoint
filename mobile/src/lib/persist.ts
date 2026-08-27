import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

function webStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw =
      Platform.OS === "web" ? webStorage()?.getItem(key) : await SecureStore.getItemAsync(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  const raw = JSON.stringify(value);
  try {
    if (Platform.OS === "web") {
      webStorage()?.setItem(key, raw);
      return;
    }
    await SecureStore.setItemAsync(key, raw);
  } catch {
    // SecureStore has a size limit on some platforms; keep in-memory state.
  }
}

export async function deleteJson(key: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      webStorage()?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
}
