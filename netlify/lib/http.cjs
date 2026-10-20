// Small response helpers shared by the Netlify functions.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: { ...JSON_HEADERS, ...extraHeaders },
  body: JSON.stringify(body),
});

const error = (statusCode, message, extra = {}) => json(statusCode, { error: message, ...extra });

const preflight = () => ({ statusCode: 204, headers: CORS_HEADERS, body: "" });

/** Thrown by helpers that already know the HTTP response they want to send. */
class HttpError extends Error {
  constructor(statusCode, message, extra = {}) {
    super(message);
    this.statusCode = statusCode;
    this.extra = extra;
  }
  toResponse() {
    return error(this.statusCode, this.message, this.extra);
  }
}

const parseJsonBody = (event) => {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
};

module.exports = { CORS_HEADERS, JSON_HEADERS, json, error, preflight, HttpError, parseJsonBody };
