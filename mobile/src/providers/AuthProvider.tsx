import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert } from "react-native";
import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { router, type Href } from "expo-router";

import { toAuthUserMessage } from "@/components/auth/AuthLayout";
import { API_ORIGIN, apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type AuthLinkResult = "recovery" | "signed-in" | null;

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  handlingDeepLink: boolean;
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<string | null>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getAuthRedirectTo() {
  const native = new URL(`${API_ORIGIN}/auth/native/callback`);
  native.searchParams.set("app_redirect", Linking.createURL("auth/callback"));
  return native.toString();
}

function authCallbackKey(params: URLSearchParams): string | null {
  return params.get("code") ?? (params.get("access_token") && params.get("refresh_token") ? "tokens" : null);
}

function logAuthCallback(details: Record<string, unknown>) {
  if (typeof __DEV__ === "undefined" || !__DEV__) return;
  console.log("[auth-callback]", details);
}

const consumedAuthKeys = new Set<string>();
const failedAuthKeys = new Set<string>();
const inFlightAuth = new Map<string, Promise<AuthLinkResult>>();

function readAuthParams(url: string): URLSearchParams {
  const params = new URLSearchParams();
  const queryIndex = url.indexOf("?");
  const hashIndex = url.indexOf("#");

  if (queryIndex >= 0) {
    const query = url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined);
    new URLSearchParams(query).forEach((value, key) => params.set(key, value));
  }
  if (hashIndex >= 0) {
    new URLSearchParams(url.slice(hashIndex + 1)).forEach((value, key) => params.set(key, value));
  }

  return params;
}

async function exchangeAuthParams(url: string): Promise<AuthLinkResult> {
  const parsed = Linking.parse(url);
  const params = readAuthParams(url);
  const errorDescription = params.get("error_description") ?? params.get("error");
  const type = params.get("type");
  const code = params.get("code");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  logAuthCallback({
    scheme: parsed.scheme,
    path: parsed.path,
    hasCode: Boolean(code),
    hasTokens: Boolean(accessToken && refreshToken),
    type,
    hasError: Boolean(errorDescription),
  });

  if (errorDescription) {
    throw new Error(errorDescription.replace(/\+/g, " "));
  }

  if (!code && !(accessToken && refreshToken)) {
    return null;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logAuthCallback({
        step: "exchangeCodeForSession",
        name: error.name,
        status: error.status,
        message: error.message,
      });
      throw error;
    }
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      logAuthCallback({
        step: "setSession",
        name: error.name,
        status: error.status,
        message: error.message,
      });
      throw error;
    }
  }

  return type === "recovery" ? "recovery" : "signed-in";
}

async function consumeAuthUrl(url: string): Promise<AuthLinkResult> {
  const params = readAuthParams(url);
  const key = authCallbackKey(params);
  if (!key) return exchangeAuthParams(url);

  if (consumedAuthKeys.has(key)) {
    logAuthCallback({ step: "skip-duplicate", hasCode: key !== "tokens" });
    return params.get("type") === "recovery" ? "recovery" : "signed-in";
  }

  if (failedAuthKeys.has(key)) {
    logAuthCallback({ step: "skip-failed-duplicate", hasCode: key !== "tokens" });
    return null;
  }

  const existing = inFlightAuth.get(key);
  if (existing) return existing;

  const pending = exchangeAuthParams(url)
    .then((result) => {
      if (result) consumedAuthKeys.add(key);
      return result;
    })
    .catch((error) => {
      failedAuthKeys.add(key);
      throw error;
    })
    .finally(() => {
      inFlightAuth.delete(key);
    });

  inFlightAuth.set(key, pending);
  return pending;
}

function applyAuthLinkResult(result: AuthLinkResult) {
  if (result === "recovery") {
    router.replace("/reset-password" as Href);
    return;
  }
  if (result === "signed-in") {
    router.replace("/account" as Href);
  }
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [handlingDeepLink, setHandlingDeepLink] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;

    const handleAuthUrl = async (url: string | null): Promise<AuthLinkResult | "error"> => {
      if (!url) return null;
      try {
        return await consumeAuthUrl(url);
      } catch (error) {
        if (mounted) {
          Alert.alert(
            "Could not complete sign-in",
            toAuthUserMessage(
              error,
              "Your email may already be confirmed. Please sign in with your password."
            )
          );
          router.replace("/login" as Href);
        }
        return "error";
      }
    };

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const initialUrl = await Linking.getInitialURL();
      const result = await handleAuthUrl(initialUrl);
      if (!mounted) return;

      if (result === "recovery") {
        setPasswordRecovery(true);
      }

      applyAuthLinkResult(result === "error" ? null : result);

      const latest =
        result === "signed-in" || result === "recovery"
          ? await supabase.auth.getSession()
          : { data };
      setSession(latest.data.session ?? data.session);
      setHandlingDeepLink(false);
      setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);

      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        router.replace("/reset-password" as Href);
        return;
      }

      if (event === "SIGNED_OUT") {
        setPasswordRecovery(false);
      }

      if (event === "USER_UPDATED") {
        setPasswordRecovery(false);
      }
    });

    const linking = Linking.addEventListener("url", ({ url }) => {
      setHandlingDeepLink(true);
      void handleAuthUrl(url)
        .then((result) => {
          if (!mounted || result === "error") return;
          if (result === "recovery") setPasswordRecovery(true);
          applyAuthLinkResult(result);
        })
        .finally(() => {
          if (mounted) setHandlingDeepLink(false);
        });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      linking.remove();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName, phone: input.phone },
        emailRedirectTo: getAuthRedirectTo(),
      },
    });
    if (error) throw error;

    const hasAuthIdentity = Boolean(data.user?.identities && data.user.identities.length > 0);

    if (data.user && hasAuthIdentity) {
      if (data.session?.access_token) {
        await apiFetch("/api/auth/ensure-customer", {
          method: "POST",
          auth: "required",
          body: JSON.stringify({ fullName: input.fullName, phone: input.phone }),
        }).catch(() => undefined);
      } else {
        await apiFetch("/api/auth/register-customer", {
          method: "POST",
          auth: "none",
          body: JSON.stringify({
            userId: data.user.id,
            email: input.email,
            fullName: input.fullName,
            phone: input.phone,
          }),
        }).catch(() => undefined);
      }
    }

    if (data.session) return null;
    return "Check your email to continue. If you already have an account, sign in or reset your password.";
  }, []);

  const signOut = useCallback(async () => {
    setPasswordRecovery(false);
    await supabase.auth.signOut();
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectTo(),
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setPasswordRecovery(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      handlingDeepLink,
      passwordRecovery,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [
      session,
      loading,
      handlingDeepLink,
      passwordRecovery,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
