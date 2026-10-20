// POST /.netlify/functions/auth-session   { credential: <Google ID token> }
//   -> { token, user: { sub, email, name, picture, plan }, quota }
// GET  /.netlify/functions/auth-session   Authorization: Bearer <session>
//   -> { user, quota }   (used on page load to restore a session and refresh quota)

const { json, preflight, error, HttpError, parseJsonBody } = require("../lib/http.cjs");
const { verifyGoogleCredential, signSession, requireUser } = require("../lib/auth.cjs");
const store = require("../lib/store.cjs");
const { getQuota } = require("../lib/quota.cjs");

const publicUser = (account) => ({
  sub: account.sub,
  email: account.email,
  name: account.name,
  picture: account.picture,
  plan: account.plan,
});

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return preflight();
  store.connectBlobs(event);

  try {
    if (event.httpMethod === "POST") {
      const { credential } = parseJsonBody(event);
      const identity = await verifyGoogleCredential(credential);
      if (!identity.emailVerified) {
        throw new HttpError(403, "Your Google account email is not verified");
      }
      const account = await store.upsertAccount(identity);
      const token = signSession(account);
      const quota = await getQuota(account.sub);
      return json(200, { token, user: publicUser(account), quota });
    }

    if (event.httpMethod === "GET") {
      const claims = requireUser(event);
      // The session is signed by us and carries the identity, so a missing account record
      // (first login on a fresh store, or after a data wipe) is simply recreated.
      const account = (await store.getAccount(claims.sub)) || (await store.upsertAccount(claims));
      const quota = await getQuota(account.sub);
      return json(200, { user: publicUser(account), quota });
    }

    return error(405, "Method not allowed");
  } catch (err) {
    if (err instanceof HttpError) return err.toResponse();
    console.error("auth-session error:", err);
    return error(500, "Authentication failed", { details: err.message });
  }
};
