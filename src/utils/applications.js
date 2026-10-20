/**
 * Application tracker storage.
 *
 * Two localStorage keys work together:
 *  - `deepApplyHistory`      — the generated materials (cover letter, CV, insights) per run.
 *                              Written by ResultsPage. Capped; oldest entries fall off.
 *  - `deepApplyApplications` — the tracker: one lightweight record per application with its
 *                              status pipeline, notes, follow-up date, and a `materialsId`
 *                              pointing at the history entry (which may have expired).
 *
 * Everything here is synchronous and safe to call during render (reads) or in handlers (writes).
 * Writes dispatch an `APPLICATIONS_CHANGED_EVENT` on `window` so open views can refresh.
 */

export const APPLICATIONS_KEY = "deepApplyApplications";
export const HISTORY_KEY = "deepApplyHistory";
export const HISTORY_LIMIT = 10;
export const APPLICATIONS_CHANGED_EVENT = "deepapply:applications-changed";
export const HISTORY_CHANGED_EVENT = "deepapply:history-changed";

/** Ordered pipeline. `rejected` is a terminal branch off any stage. */
export const STATUSES = ["saved", "applied", "interview", "offer", "rejected"];

export const STATUS_LABELS = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

const safeParse = (raw, fallback) => {
  try {
    const value = JSON.parse(raw);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const readList = (key) => {
  try {
    const list = safeParse(localStorage.getItem(key) || "[]", []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const writeList = (key, list) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch (error) {
    console.warn(`Failed to write ${key}:`, error);
    return false;
  }
};

const notify = () => {
  try {
    window.dispatchEvent(new Event(APPLICATIONS_CHANGED_EVENT));
  } catch {
    /* non-browser context */
  }
};

export const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const nowIso = () => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* History (generated materials)                                        */
/* ------------------------------------------------------------------ */

/** Returns history entries, newest first. Legacy entries without an id are given one lazily. */
export const loadHistory = () => {
  const list = readList(HISTORY_KEY);
  let changed = false;
  const withIds = list.map((entry) => {
    if (entry && typeof entry === "object" && !entry.id) {
      changed = true;
      return { ...entry, id: makeId(), createdAt: entry.createdAt || nowIso() };
    }
    return entry;
  });
  if (changed) writeList(HISTORY_KEY, withIds);
  return withIds;
};

export const getHistoryEntry = (id) =>
  id ? loadHistory().find((entry) => entry?.id === id) || null : null;

/**
 * Prepends a result to history (deduped by id) and trims to HISTORY_LIMIT.
 * Returns the stored entry, which always carries an id.
 */
export const saveHistoryEntry = (entry) => {
  const stored = {
    ...entry,
    id: entry.id || makeId(),
    createdAt: entry.createdAt || nowIso(),
  };
  const rest = loadHistory().filter((item) => item?.id !== stored.id);
  if (writeList(HISTORY_KEY, [stored, ...rest].slice(0, HISTORY_LIMIT))) {
    try {
      window.dispatchEvent(new Event(HISTORY_CHANGED_EVENT));
    } catch {
      /* non-browser context */
    }
  }
  return stored;
};

/* ------------------------------------------------------------------ */
/* Applications (tracker)                                               */
/* ------------------------------------------------------------------ */

/**
 * @typedef {Object} Application
 * @property {string} id
 * @property {string} company
 * @property {string} title
 * @property {string} location
 * @property {"saved"|"applied"|"interview"|"offer"|"rejected"} status
 * @property {{status: string, at: string}[]} statusHistory  oldest first
 * @property {string} notes
 * @property {string|null} followUpAt   ISO date (YYYY-MM-DD) or null
 * @property {string|null} appliedAt    ISO timestamp set when status first becomes "applied"
 * @property {number|null} fitScore
 * @property {string} recommendation    "strong fit" | "reach" | "pass" | ""
 * @property {string|null} materialsId  id of the history entry; may no longer exist
 * @property {string} jobSnippet        first ~200 chars of the job text, for recognisability
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} [deletedAt]  set on tombstones (soft-deleted records kept for sync)
 */

/** Tombstones older than this are purged; a device offline for longer may resurrect a deletion. */
export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const isTombstone = (app) => Boolean(app?.deletedAt);
const isExpiredTombstone = (app, now = Date.now()) =>
  isTombstone(app) && now - new Date(app.deletedAt).getTime() > TOMBSTONE_TTL_MS;

/**
 * Every stored record including tombstones (records with `deletedAt`), newest first.
 * Use this for sync so deletions propagate; views should use loadApplications().
 */
export const loadApplicationsRaw = () => {
  const list = readList(APPLICATIONS_KEY).filter((app) => app && typeof app === "object" && app.id);
  const live = list.filter((app) => !isExpiredTombstone(app));
  if (live.length !== list.length) writeList(APPLICATIONS_KEY, live);
  return live.sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
};

/** Live (non-deleted) records, newest first. */
export const loadApplications = () => loadApplicationsRaw().filter((app) => !isTombstone(app));

export const getApplication = (id) => loadApplications().find((app) => app.id === id) || null;

const persist = (list) => {
  const ok = writeList(APPLICATIONS_KEY, list);
  if (ok) notify();
  return ok;
};

/** Insert or replace by id (revives a tombstone). Returns the stored record. */
export const upsertApplication = (app) => {
  const list = loadApplicationsRaw();
  const existing = list.find((item) => item.id === app.id);
  const stored = {
    ...(existing || {}),
    ...app,
    deletedAt: null,
    createdAt: existing?.createdAt || app.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  persist([stored, ...list.filter((item) => item.id !== stored.id)]);
  return stored;
};

/**
 * Shallow-merge a patch. Changing `status` appends to statusHistory and stamps
 * `appliedAt` the first time the record moves to "applied". Returns the updated record, or null
 * when the id is unknown or the write failed. An off-list status is ignored (returns current).
 */
export const updateApplication = (id, patch) => {
  const list = loadApplicationsRaw();
  const current = list.find((item) => item.id === id && !isTombstone(item));
  if (!current) return null;

  const next = { ...current, ...patch, updatedAt: nowIso() };

  if (patch.status && patch.status !== current.status) {
    if (!STATUSES.includes(patch.status)) return current;
    next.statusHistory = [...(current.statusHistory || []), { status: patch.status, at: next.updatedAt }];
    if (patch.status === "applied" && !current.appliedAt) next.appliedAt = next.updatedAt;
  }

  const ok = persist(list.map((item) => (item.id === id ? next : item)));
  return ok ? next : null;
};

/**
 * Soft delete: the record becomes a tombstone (`deletedAt` set, personal fields dropped) so the
 * deletion wins the newest-updatedAt merge on other devices instead of being resurrected.
 */
export const removeApplication = (id) => {
  const list = loadApplicationsRaw();
  const current = list.find((item) => item.id === id && !isTombstone(item));
  if (!current) return false;
  const at = nowIso();
  const tombstone = {
    id: current.id,
    materialsId: current.materialsId || null,
    createdAt: current.createdAt,
    updatedAt: at,
    deletedAt: at,
  };
  return persist(list.map((item) => (item.id === id ? tombstone : item)));
};

/** Find the tracker record that points at a given history entry. */
export const findApplicationByMaterials = (materialsId) =>
  materialsId ? loadApplications().find((app) => app.materialsId === materialsId) || null : null;

/** True when a record with this id was deleted (and the tombstone has not expired). */
export const isApplicationDeleted = (id) =>
  Boolean(id && loadApplicationsRaw().find((app) => app.id === id && isTombstone(app)));

/* ------------------------------------------------------------------ */
/* Deriving a record from a generation result                          */
/* ------------------------------------------------------------------ */

const firstLine = (text) =>
  String(text || "")
    .split("\n")
    .map((line) => line.replace(/^[#*\s]+/, "").trim())
    .find(Boolean) || "";

/**
 * Build a new Application from what ResultsPage has in hand. Prefers the model's `jobSummary`
 * (company/title/location) and falls back to the first line of the job text.
 */
export const createApplicationFromResult = ({ generatedContent, formData, materialsId }) => {
  const summary = generatedContent?.jobSummary || {};
  const fit = generatedContent?.strategicInsights?.fitAssessment || null;
  const jobText = formData?.jobData || "";
  const heading = firstLine(jobText);

  return {
    id: makeId(),
    company: String(summary.company || "").trim() || "Unknown company",
    title: String(summary.title || "").trim() || heading || "Untitled role",
    location: String(summary.location || "").trim(),
    status: "saved",
    statusHistory: [{ status: "saved", at: nowIso() }],
    notes: "",
    followUpAt: null,
    appliedAt: null,
    fitScore: typeof fit?.matchScore === "number" && Number.isFinite(fit.matchScore) ? fit.matchScore : null,
    recommendation: typeof fit?.recommendation === "string" ? fit.recommendation : "",
    materialsId: materialsId || null,
    jobSnippet: jobText.replace(/\s+/g, " ").trim().slice(0, 200),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
};

/* ------------------------------------------------------------------ */
/* Small helpers views tend to need                                     */
/* ------------------------------------------------------------------ */

/** YYYY-MM-DD in the user's local timezone (toISOString would be UTC and can be a day off). */
export const localDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** True when followUpAt is set and is today or in the past (local date). */
export const isFollowUpDue = (app, today = new Date()) => {
  if (!app?.followUpAt || ["offer", "rejected"].includes(app.status)) return false;
  return app.followUpAt <= localDateKey(today);
};

/** Whole days since the record was created (or applied, when known). */
export const daysSince = (iso, now = new Date()) => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.max(0, Math.floor((now.getTime() - then) / 86400000));
};

export const countByStatus = (apps) =>
  STATUSES.reduce((acc, status) => {
    acc[status] = apps.filter((app) => app.status === status).length;
    return acc;
  }, {});
