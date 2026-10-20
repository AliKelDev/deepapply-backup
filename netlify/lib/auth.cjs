// Authentication for the Netlify functions.
//
// Flow: the browser signs in with Google Identity Services and gets a Google ID token
// (valid ~1h). It posts that once to /auth-session, which verifies it against our
// GOOGLE_CLIENT_ID and returns our own session token (HS256 JWT, 30 days, signed with
// SESSION_SECRET). Every other function calls `requireUser(event)` which checks the
// `Authorization: Bearer <session>` header.

const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { HttpError } = require("./http.cjs");

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const getClientId = () => process.env.GOOGLE_CLIENT_ID || "";
const getSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new HttpError(500, "SESSION_SECRET is not configured");
  }
  return secret;
};

const b64url = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const fromB64url = (input) =>
  Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

const sign = (data, secret) => b64url(crypto.createHmac("sha256", secret).update(data).digest());

/**
 * Verify a Google ID token and return the identity we keep.
 * @returns {Promise<{sub:string,email:string,emailVerified:boolean,name:string,picture:string}>}
 */
const verifyGoogleCredential = async (credential) => {
  const clientId = getClientId();
  if (!clientId) throw new HttpError(500, "GOOGLE_CLIENT_ID is not configured");
  if (!credential || typeof credential !== "string") throw new HttpError(400, "Missing Google credential");

  const client = new OAuth2Client(clientId);
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch (err) {
    throw new HttpError(401, "Google sign-in could not be verified", { details: err.message });
  }
  if (!payload?.sub) throw new HttpError(401, "Google token has no subject");

  return {
    sub: payload.sub,
    email: payload.email || "",
    emailVerified: Boolean(payload.email_verified),
    name: payload.name || "",
    picture: payload.picture || "",
  };
};

/** Mint our session token for a user record. */
const signSession = (user, { now = Math.floor(Date.now() / 1000), ttl = SESSION_TTL_SECONDS } = {}) => {
  const secret = getSecret();
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(
    JSON.stringify({ sub: user.sub, email: user.email, name: user.name, picture: user.picture, iat: now, exp: now + ttl })
  );
  return `${header}.${body}.${sign(`${header}.${body}`, secret)}`;
};

/** Verify our session token. Returns the claims or throws HttpError(401). */
const verifySession = (token) => {
  const secret = getSecret();
  const parts = typeof token === "string" ? token.split(".") : [];
  if (parts.length !== 3) throw new HttpError(401, "Invalid session token");
  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new HttpError(401, "Invalid session token");

  let claims;
  try {
    claims = JSON.parse(fromB64url(body));
  } catch {
    throw new HttpError(401, "Invalid session token");
  }
  if (!claims.sub || typeof claims.exp !== "number" || claims.exp < Math.floor(Date.now() / 1000)) {
    throw new HttpError(401, "Session expired, please sign in again", { code: "SESSION_EXPIRED" });
  }
  return claims;
};

/** Sign-in is enabled only once GOOGLE_CLIENT_ID is configured. */
const isAuthConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID);

const getBearer = (event) => {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
};

/**
 * Require a signed-in user. Returns the session claims {sub,email,name,picture,iat,exp}
 * or throws HttpError(401) — callers do `catch (e) { if (e instanceof HttpError) return e.toResponse(); }`.
 */
const requireUser = (event) => {
  const token = getBearer(event);
  if (!token) throw new HttpError(401, "Sign in to continue", { code: "AUTH_REQUIRED" });
  return verifySession(token);
};

/**
 * Like requireUser, but returns null (anonymous) while Google sign-in is not configured, so a
 * deployment without GOOGLE_CLIENT_ID keeps working as the pre-auth app did. Once the client id
 * is set, every call requires a session.
 */
let warnedUnconfigured = false;
const optionalUser = (event) => {
  if (!isAuthConfigured()) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn("GOOGLE_CLIENT_ID is not set: functions are running WITHOUT sign-in or quota enforcement");
    }
    return null;
  }
  return requireUser(event);
};

module.exports = {
  verifyGoogleCredential,
  signSession,
  verifySession,
  requireUser,
  optionalUser,
  isAuthConfigured,
  getBearer,
  SESSION_TTL_SECONDS,
};
