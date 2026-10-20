/**
 * Local-first sync: merge local and cloud snapshots on login, then push after
 * local writes. These helpers never access browser storage or own auth state.
 * The server replaces supplied keys; callers serialize pushes to avoid races.
 * Union merges have no deletion tombstones: a stale device can restore a deleted
 * record on its next login. Equal timestamps prefer local data deterministically.
 */
import { HISTORY_LIMIT } from "./applications.js";

const ENDPOINT = "/.netlify/functions/user-data";

async function request(token, method, body) {
  const response = await fetch(ENDPOINT, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Preserve HTTP status even when an upstream failure returns HTML.
  }
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : `Cloud sync failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    if (response.status === 401 || payload?.code === "AUTH_REQUIRED") err.code = "AUTH_REQUIRED";
    else if (typeof payload?.code === "string") err.code = payload.code;
    throw err;
  }
  return payload;
}

export const fetchCloudData = (token) => request(token, "GET");

/** Omitted/undefined keys are not sent; null profile is not a deletion command. */
export const pushCloudData = (token, { profile, applications, history } = {}) =>
  request(token, "PUT", { profile, applications, history });

export const clearCloudData = (token) => request(token, "DELETE");

const timestamp = (value) => {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : -Infinity;
};
const applicationTime = (record) => {
  const updated = timestamp(record.updatedAt);
  return updated === -Infinity ? timestamp(record.createdAt) : updated;
};
const historyTime = (record) => timestamp(record.createdAt);

function mergeById(localList, cloudList, getTime) {
  const records = new Map();
  // Cloud first, then local: ties deliberately favor the local copy.
  for (const list of [cloudList, localList]) {
    for (const record of Array.isArray(list) ? list : []) {
      if (!record || typeof record !== "object" || Array.isArray(record) || typeof record.id !== "string" || !record.id.trim()) continue;
      const existing = records.get(record.id);
      if (!existing || getTime(record) >= getTime(existing)) records.set(record.id, record);
    }
  }
  return [...records.values()].sort((a, b) => {
    const left = getTime(a);
    const right = getTime(b);
    if (left !== right) return left > right ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export const mergeApplications = (localList, cloudList) => mergeById(localList, cloudList, applicationTime);
export const mergeHistory = (localList, cloudList) => mergeById(localList, cloudList, historyTime).slice(0, HISTORY_LIMIT);

// Empty skeleton arrays/objects do not make a profile look filled in. Count
// top-level fields only, but inspect containers for actual non-empty content.
function nonEmpty(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.some(nonEmpty);
  if (typeof value === "object") return Object.values(value).some(nonEmpty);
  return true;
}
const filledFields = (profile) => Object.entries(profile)
  .filter(([key, value]) => !["updatedAt", "createdAt"].includes(key) && nonEmpty(value)).length;

export function mergeProfile(localProfile, cloudProfile) {
  if (localProfile == null) return cloudProfile ?? null;
  if (cloudProfile == null) return localProfile;
  if (Object.prototype.hasOwnProperty.call(localProfile, "updatedAt") || Object.prototype.hasOwnProperty.call(cloudProfile, "updatedAt")) {
    return timestamp(cloudProfile.updatedAt) > timestamp(localProfile.updatedAt) ? cloudProfile : localProfile;
  }
  return filledFields(cloudProfile) > filledFields(localProfile) ? cloudProfile : localProfile;
}
