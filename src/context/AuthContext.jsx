/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  APPLICATIONS_CHANGED_EVENT,
  HISTORY_CHANGED_EVENT,
  APPLICATIONS_KEY,
  HISTORY_KEY,
  loadApplicationsRaw,
  loadHistory,
} from "../utils/applications";
import { fetchCloudData, pushCloudData, mergeApplications, mergeHistory, mergeProfile } from "../utils/cloudSync";

/**
 * Google sign-in + session + cloud sync.
 *
 * - Google Identity Services gives us an ID token; /auth-session swaps it for our 30-day session.
 * - The session token lives in localStorage (SESSION_KEY) and is sent as `Authorization: Bearer`.
 * - Sync is local-first: on sign-in we pull the cloud copy, merge with what is in this browser,
 *   write the merged result locally, and push it back. After that, any local write (tracker,
 *   history, profile) schedules a debounced push. Signed-out users keep working locally.
 */

export const SESSION_KEY = "deepApplySession";
export const PROFILE_KEY = "deepApplyProfile";
export const PROFILE_CHANGED_EVENT = "deepapply:profile-changed";
const GSI_SRC = "https://accounts.google.com/gsi/client";
const PUSH_DEBOUNCE_MS = 1500;

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const AuthContext = createContext(null);

const readJSON = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key, value) => {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write ${key}`, error);
  }
};

/** Load the GIS script once. Resolves with window.google.accounts.id or rejects. */
let gsiPromise = null;
export const loadGoogleIdentity = () => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () =>
      window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error("Google Identity failed to load"));
    script.onerror = () => reject(new Error("Google Identity script failed to load"));
    document.head.appendChild(script);
  });
  return gsiPromise;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(SESSION_KEY) || "");
  const [user, setUser] = useState(null);
  const [quota, setQuota] = useState(null);
  // "loading" while restoring a stored session, then "signed-in" | "signed-out"
  const [status, setStatus] = useState(() => (localStorage.getItem(SESSION_KEY) ? "loading" : "signed-out"));
  const [syncState, setSyncState] = useState("idle"); // idle | syncing | synced | error
  const [authError, setAuthError] = useState("");
  const pushTimer = useRef(null);
  const pushInFlight = useRef(false);
  const pushPending = useRef(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setToken("");
    setUser(null);
    setQuota(null);
    setStatus("signed-out");
    setSyncState("idle");
  }, []);

  /** fetch() that adds the session header and signs the user out on 401. */
  const authFetch = useCallback(
    async (input, init = {}) => {
      const headers = new Headers(init.headers || {});
      if (tokenRef.current) headers.set("Authorization", `Bearer ${tokenRef.current}`);
      const response = await fetch(input, { ...init, headers });
      if (response.status === 401 && tokenRef.current) {
        clearSession();
      }
      return response;
    },
    [clearSession]
  );

  const refreshQuota = useCallback(async () => {
    if (!tokenRef.current) return null;
    const response = await authFetch("/.netlify/functions/auth-session");
    if (!response.ok) return null;
    const data = await response.json();
    setUser(data.user);
    setQuota(data.quota);
    return data.quota;
  }, [authFetch]);

  /* ---------------- cloud sync ---------------- */

  // `profile` is undefined (not null) when absent: the endpoint treats an omitted key as
  // "leave unchanged" and rejects null.
  const collectLocal = () => ({
    profile: readJSON(PROFILE_KEY, undefined) ?? undefined,
    // Raw list includes tombstones so deletions propagate across devices.
    applications: loadApplicationsRaw(),
    history: loadHistory(),
  });

  // Pushes are serialized: a push requested while one is in flight runs once it finishes,
  // so an older snapshot can never land after a newer one.
  const pushNow = useCallback(async () => {
    if (!tokenRef.current) return;
    if (pushInFlight.current) {
      pushPending.current = true;
      return;
    }
    pushInFlight.current = true;
    try {
      setSyncState("syncing");
      await pushCloudData(tokenRef.current, collectLocal());
      setSyncState("synced");
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") clearSession();
      else {
        console.warn("Cloud push failed:", error);
        setSyncState("error");
      }
    } finally {
      pushInFlight.current = false;
      if (pushPending.current) {
        pushPending.current = false;
        pushNow();
      }
    }
  }, [clearSession]);

  const schedulePush = useCallback(() => {
    if (!tokenRef.current) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(pushNow, PUSH_DEBOUNCE_MS);
  }, [pushNow]);

  /** Pull cloud data, merge with local, write both sides. */
  const syncFromCloud = useCallback(
    async (sessionToken) => {
      try {
        setSyncState("syncing");
        const cloud = await fetchCloudData(sessionToken);
        const local = collectLocal();
        const merged = {
          profile: mergeProfile(local.profile ?? null, cloud.profile ?? null) ?? undefined,
          applications: mergeApplications(local.applications, cloud.applications || []),
          history: mergeHistory(local.history, cloud.history || []),
        };
        writeJSON(PROFILE_KEY, merged.profile);
        writeJSON(APPLICATIONS_KEY, merged.applications);
        writeJSON(HISTORY_KEY, merged.history);
        window.dispatchEvent(new Event(APPLICATIONS_CHANGED_EVENT));
        window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
        await pushCloudData(sessionToken, merged);
        setSyncState("synced");
      } catch (error) {
        if (error.code === "AUTH_REQUIRED") clearSession();
        else {
          console.warn("Cloud sync failed:", error);
          setSyncState("error");
        }
      }
    },
    [clearSession]
  );

  /* ---------------- sign in / out ---------------- */

  /** Called with the GIS credential response. */
  const signInWithCredential = useCallback(
    async (credential) => {
      setAuthError("");
      const response = await fetch("/.netlify/functions/auth-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data.error || "Sign-in failed";
        setAuthError(message);
        throw new Error(message);
      }
      localStorage.setItem(SESSION_KEY, data.token);
      setUser(data.user);
      setQuota(data.quota);
      setStatus("signed-in");
      // Setting the token triggers the restore effect below, which runs the cloud sync.
      setToken(data.token);
      return data.user;
    },
    []
  );

  const signOut = useCallback(() => {
    clearTimeout(pushTimer.current);
    try {
      window.google?.accounts?.id?.disableAutoSelect?.();
    } catch {
      /* ignore */
    }
    clearSession();
  }, [clearSession]);

  /* ---------------- effects ---------------- */

  // Restore a stored session on load.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/.netlify/functions/auth-session", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!response.ok) {
          clearSession();
          return;
        }
        const data = await response.json();
        setUser(data.user);
        setQuota(data.quota);
        setStatus("signed-in");
        syncFromCloud(token);
      } catch (error) {
        if (!cancelled) {
          console.warn("Session restore failed:", error);
          setStatus("signed-in"); // offline: keep the session, retry later
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only on mount / token change; syncFromCloud and clearSession are stable.
  }, [token, clearSession, syncFromCloud]);

  // Push after local writes while signed in.
  useEffect(() => {
    if (status !== "signed-in") return undefined;
    const onChange = () => schedulePush();
    window.addEventListener(APPLICATIONS_CHANGED_EVENT, onChange);
    window.addEventListener(HISTORY_CHANGED_EVENT, onChange);
    window.addEventListener(PROFILE_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(APPLICATIONS_CHANGED_EVENT, onChange);
      window.removeEventListener(HISTORY_CHANGED_EVENT, onChange);
      window.removeEventListener(PROFILE_CHANGED_EVENT, onChange);
      clearTimeout(pushTimer.current);
    };
  }, [status, schedulePush]);

  const value = useMemo(
    () => ({
      status,
      isSignedIn: status === "signed-in",
      isConfigured: Boolean(GOOGLE_CLIENT_ID),
      user,
      token,
      quota,
      syncState,
      authError,
      authFetch,
      refreshQuota,
      setQuota,
      signInWithCredential,
      signOut,
      pushNow,
    }),
    [status, user, token, quota, syncState, authError, authFetch, refreshQuota, signInWithCredential, signOut, pushNow]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = { children: PropTypes.node };

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

/** Let non-React code (e.g. ProfilePage save) announce a profile write. */
export const notifyProfileChanged = () => {
  try {
    window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
};
