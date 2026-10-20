// Per-user snapshots. Merge policy belongs to the client, not this endpoint.
const { json, error, preflight, HttpError, parseJsonBody } = require("../lib/http.cjs");
const { requireUser } = require("../lib/auth.cjs");
const store = require("../lib/store.cjs");

const MAX_BODY_BYTES = 900 * 1024;
const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const timestamp = (value) => {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : -Infinity;
};
const newestFirst = (a, b) => {
  const left = timestamp(a.createdAt);
  const right = timestamp(b.createdAt);
  return left === right ? 0 : left > right ? -1 : 1;
};

const snapshot = async (sub) => {
  const [profile, applications, history] = await Promise.all([
    store.getProfile(sub), store.getApplications(sub), store.getHistory(sub),
  ]);
  return {
    profile: profile ?? null,
    applications: applications ?? [],
    history: history ?? [],
    // Response/read time, not a version token or an atomic snapshot revision.
    syncedAt: new Date().toISOString(),
  };
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return preflight();
  store.connectBlobs(event);

  try {
    const { sub } = await requireUser(event);
    if (event.httpMethod === "GET") {
      return json(200, await snapshot(sub), { "Cache-Control": "no-store" });
    }

    if (event.httpMethod === "PUT") {
      const raw = event.body || "";
      // Measure decoded UTF-8 bytes, including whitespace and records which
      // would later be trimmed by the history cap. Base64 is transport only.
      const bytes = event.isBase64Encoded
        ? Buffer.from(raw, "base64").length
        : Buffer.byteLength(raw, "utf8");
      if (bytes > MAX_BODY_BYTES) throw new HttpError(413, "Synced data exceeds the 900 KiB limit");

      const body = parseJsonBody(event);
      if (!isObject(body)) throw new HttpError(400, "Request body must be an object");
      if (Object.keys(body).some((key) => !["profile", "applications", "history"].includes(key))) {
        throw new HttpError(400, "Only profile, applications, and history may be provided");
      }
      if (has(body, "profile") && !isObject(body.profile)) {
        throw new HttpError(400, "profile must be an object");
      }
      // Validate everything before starting any writes, including rows that
      // would be outside the retained history window.
      for (const field of ["applications", "history"]) {
        if (has(body, field) && (!Array.isArray(body[field]) || body[field].some(
          (row) => !isObject(row) || typeof row.id !== "string" || !row.id.trim()
        ))) {
          throw new HttpError(400, `${field} must be an array of objects with non-empty string ids`);
        }
      }

      const writes = [];
      if (has(body, "profile")) writes.push(store.setProfile(sub, body.profile));
      if (has(body, "applications")) writes.push(store.setApplications(sub, body.applications));
      if (has(body, "history")) {
        writes.push(store.setHistory(sub, [...body.history].sort(newestFirst).slice(0, store.HISTORY_LIMIT)));
      }
      // Blobs has no multi-key transaction. An infrastructure failure can leave
      // a partial write; callers may safely retry the same per-key snapshots.
      await Promise.all(writes);
      return json(200, await snapshot(sub), { "Cache-Control": "no-store" });
    }

    if (event.httpMethod === "DELETE") {
      await Promise.all(["profile", "applications", "history"].map(
        (field) => store.remove(store.key(sub, field))
      ));
      return json(200, { ok: true }, { "Cache-Control": "no-store" });
    }

    return json(405, { error: "Method not allowed" }, { Allow: "GET, PUT, DELETE, OPTIONS" });
  } catch (err) {
    if (err instanceof HttpError) return err.toResponse();
    // Do not expose/log storage errors which might embed profile data or tokens.
    console.error("user-data persistence failed");
    return error(500, "Could not sync user data");
  }
};
