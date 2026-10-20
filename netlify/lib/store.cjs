// Per-user persistence on Netlify Blobs.
//
// One store, `deepapply-users`, keyed by the Google `sub`:
//   users/<sub>/account        { sub, email, name, picture, plan, createdAt, lastLoginAt }
//   users/<sub>/profile        the ProfilePage object (same shape as localStorage deepApplyProfile)
//   users/<sub>/applications   Application[]  (see src/utils/applications.js)
//   users/<sub>/history        history entries (generated materials), capped
//   users/<sub>/usage/<YYYY-MM> { generations: number }
//
// Blobs are configured automatically when running on Netlify or under `netlify dev`.

const { getStore, connectLambda } = require("@netlify/blobs");

const STORE_NAME = "deepapply-users";
const HISTORY_LIMIT = 10;

/**
 * Lambda-compatible functions don't get the Blobs context injected automatically;
 * call this with the handler's `event` before any read/write. Safe to call repeatedly.
 */
const connectBlobs = (event) => {
  try {
    if (event) connectLambda(event);
  } catch (err) {
    console.warn("connectLambda failed:", err.message);
  }
};

let cached;
const store = () => {
  if (!cached) cached = getStore({ name: STORE_NAME });
  return cached;
};

const key = (sub, ...parts) => ["users", sub, ...parts].join("/");

// Reads ask for strong consistency (so a quota increment or a sync push is visible on the very
// next read). The local `netlify dev` Blobs server cannot serve strong reads, so fall back to the
// default consistency there instead of failing.
let strongReadsSupported = true;
const readJSON = async (k, fallback = null) => {
  let value;
  if (strongReadsSupported) {
    try {
      value = await store().get(k, { type: "json", consistency: "strong" });
    } catch (err) {
      if (!/uncachedEdgeURL|strong consistency/i.test(err?.message || "")) throw err;
      strongReadsSupported = false;
      console.warn("Blobs: strong reads unavailable here, using default consistency");
    }
  }
  if (!strongReadsSupported) value = await store().get(k, { type: "json" });
  return value === null || value === undefined ? fallback : value;
};

const writeJSON = async (k, value) => {
  await store().setJSON(k, value);
  return value;
};

const remove = async (k) => store().delete(k);

/* ---------------- account ---------------- */

const PLANS = { free: "free", pro: "pro" };

const getAccount = (sub) => readJSON(key(sub, "account"));

/** Create the account on first login, refresh identity fields on later logins. */
const upsertAccount = async (identity) => {
  const existing = await getAccount(identity.sub);
  const now = new Date().toISOString();
  const account = {
    sub: identity.sub,
    email: identity.email || existing?.email || "",
    name: identity.name || existing?.name || "",
    picture: identity.picture || existing?.picture || "",
    plan: existing?.plan || PLANS.free,
    createdAt: existing?.createdAt || now,
    lastLoginAt: now,
  };
  return writeJSON(key(identity.sub, "account"), account);
};

/* ---------------- user data ---------------- */

const getProfile = (sub) => readJSON(key(sub, "profile"));
const setProfile = (sub, profile) => writeJSON(key(sub, "profile"), profile);

const getApplications = (sub) => readJSON(key(sub, "applications"), []);
const setApplications = (sub, list) => writeJSON(key(sub, "applications"), Array.isArray(list) ? list : []);

const getHistory = (sub) => readJSON(key(sub, "history"), []);
const setHistory = (sub, list) =>
  writeJSON(key(sub, "history"), (Array.isArray(list) ? list : []).slice(0, HISTORY_LIMIT));

/* ---------------- usage ---------------- */

const monthKey = (date = new Date()) => date.toISOString().slice(0, 7); // YYYY-MM (UTC)

const getUsage = async (sub, date) => readJSON(key(sub, "usage", monthKey(date)), { generations: 0 });

const incrementGenerations = async (sub, date) => {
  const k = key(sub, "usage", monthKey(date));
  const current = await readJSON(k, { generations: 0 });
  const next = { generations: (current.generations || 0) + 1, updatedAt: new Date().toISOString() };
  await writeJSON(k, next);
  return next;
};

module.exports = {
  connectBlobs,
  STORE_NAME,
  HISTORY_LIMIT,
  PLANS,
  key,
  readJSON,
  writeJSON,
  remove,
  getAccount,
  upsertAccount,
  getProfile,
  setProfile,
  getApplications,
  setApplications,
  getHistory,
  setHistory,
  monthKey,
  getUsage,
  incrementGenerations,
};
