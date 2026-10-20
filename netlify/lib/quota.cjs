// Generation quota per user per calendar month.
//
// Free accounts get FREE_MONTHLY_GENERATIONS (default 10). A `pro` plan is unlimited;
// nothing sets `plan: "pro"` yet — that is where the paid tier plugs in later.

const { HttpError } = require("./http.cjs");
const store = require("./store.cjs");

const freeLimit = () => {
  const n = Number(process.env.FREE_MONTHLY_GENERATIONS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
};

const limitForPlan = (plan) => (plan === store.PLANS.pro ? Infinity : freeLimit());

/** { plan, used, limit, remaining, resetsAt } — limit is null when unlimited. */
const getQuota = async (sub) => {
  const [account, usage] = await Promise.all([store.getAccount(sub), store.getUsage(sub)]);
  const plan = account?.plan || store.PLANS.free;
  const limit = limitForPlan(plan);
  const used = usage?.generations || 0;
  const now = new Date();
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  return {
    plan,
    used,
    limit: Number.isFinite(limit) ? limit : null,
    remaining: Number.isFinite(limit) ? Math.max(0, limit - used) : null,
    resetsAt,
  };
};

/** Throws HttpError(429, code QUOTA_EXCEEDED) when the month's allowance is used up. */
const assertCanGenerate = async (sub) => {
  const quota = await getQuota(sub);
  if (quota.remaining === 0) {
    throw new HttpError(429, "You've used all your free generations for this month", {
      code: "QUOTA_EXCEEDED",
      quota,
    });
  }
  return quota;
};

/** Call after a successful generation. Returns the refreshed quota. */
const recordGeneration = async (sub) => {
  await store.incrementGenerations(sub);
  return getQuota(sub);
};

module.exports = { getQuota, assertCanGenerate, recordGeneration, freeLimit };
