const { HttpError } = require("../lib/http.cjs");
const { optionalUser } = require("../lib/auth.cjs");

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const MODEL_ID = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

const buildSystemPrompt = ({ jobContext, candidateSummary, focusQuestions }) => `
You are "Coach" — a warm, sharp, genuinely helpful interview coach running a mock interview for a candidate who is preparing for a specific role. Think of yourself as the mentor everyone wishes they had: encouraging, but honest enough to actually help them improve.

You have real latitude here. Read the candidate's answers and adapt — push harder when they're coasting, ease up and build confidence when they're nervous, follow an interesting thread if it's worth it. Mix question types (behavioral, technical, situational, "tell me about a time…") as fits the role. You decide the difficulty and the pacing. A great coach reads the room.

Here is the context you're working with:

## The Role
${jobContext || "(No job description was provided — infer a reasonable role from the candidate's materials and ask the candidate what they're targeting if it's unclear.)"}

## The Candidate's Background
${candidateSummary || "(Limited background provided — feel free to ask the candidate about their experience early on.)"}

${focusQuestions && focusQuestions.length ? `## Question Ideas To Draw From (optional inspiration, not a script)\n${focusQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}` : ""}

## How the session flows
- On your very first turn (no candidate answers yet), give a short, friendly intro (1-2 sentences) and ask your first question. Don't grade anything yet.
- After each candidate answer, react like a coach: tell them honestly how it landed, what was strong, what to tighten — then ask your next question. One question at a time keeps it realistic.
- Score honestly. An inflated score helps no one; a 5/10 with a clear path to a 9 is a gift. Calibrate to the seniority the role implies.
- When it feels like a natural stopping point (or the candidate asks to wrap up), give a warm closing summary and set "done" to true.

## Response format
Reply with a single JSON object. Only "reply" is required every turn; include the grading fields when you're reacting to an answer (skip them on your opening turn):

{
  "reply": "what you say to the candidate — warm, conversational, markdown allowed. Include your next question here.",
  "score": 0-10 integer (omit on the opening turn),
  "verdict": "a short label like 'Strong start', 'Getting there', 'Needs specifics'",
  "highlights": ["what genuinely worked", "..."],
  "suggestions": ["concrete, kind ways to level it up", "..."],
  "sampleAnswer": "optional: a brief example of a stronger answer, when it would help",
  "done": false
}
`;

// Retry transient failures (rate limits, overloads, empty responses).
const retryRequest = async (fn, retries = 3, delay = 600) => {
  try {
    return await fn();
  } catch (error) {
    const shouldRetry =
      error.status === 429 ||
      error.status === 502 ||
      error.status === 503 ||
      error.message?.includes("Empty response") ||
      error.message?.includes("overloaded") ||
      error.message?.includes("Rate limit");

    if (shouldRetry && retries > 0) {
      await new Promise((res) => setTimeout(res, delay));
      return retryRequest(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

const callDeepSeek = async (apiKey, messages) => {
  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages,
      temperature: 0.8,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const err = new Error(`DeepSeek API error ${res.status}: ${errText.substring(0, 200)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";
  // An empty body is almost always a transient hiccup — treat it as retryable.
  if (!content.trim()) {
    const err = new Error("Empty response from DeepSeek");
    err.status = 502;
    throw err;
  }
  return content;
};

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    optionalUser(event);
  } catch (err) {
    if (err instanceof HttpError) return { ...err.toResponse(), headers: { ...headers, "Content-Type": "application/json" } };
    throw err;
  }

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "DEEPSEEK_API_KEY not configured" }),
      };
    }

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }

    const {
      jobContext = "",
      candidateSummary = "",
      focusQuestions = [],
      messages = [],
    } = payload;

    // Map the client transcript ("coach"/"candidate") to OpenAI roles, defensively.
    const history = Array.isArray(messages)
      ? messages
          .filter((m) => m && typeof m.content === "string" && m.content.trim())
          .slice(-20) // keep the conversation bounded
          .map((m) => ({
            role: m.role === "candidate" || m.role === "user" ? "user" : "assistant",
            content: m.content,
          }))
      : [];

    const chatMessages = [
      {
        role: "system",
        content: buildSystemPrompt({ jobContext, candidateSummary, focusQuestions }),
      },
      ...history,
    ];

    // If there's no candidate turn yet, nudge the model to open the session.
    if (!history.some((m) => m.role === "user")) {
      chatMessages.push({
        role: "user",
        content: "[The candidate just opened the coaching session. Please introduce yourself briefly and ask your first interview question.]",
      });
    }

    const raw = await retryRequest(() => callDeepSeek(apiKey, chatMessages), 3, 600);

    let parsed;
    try {
      const match = raw.match(/```json\n?([\s\S]*?)\n?```/);
      parsed = JSON.parse(match ? match[1] : raw);
    } catch {
      // If the model returned prose instead of JSON, surface it as the reply
      // rather than dropping it — raw is guaranteed non-empty by callDeepSeek.
      parsed = { reply: raw };
    }

    if (typeof parsed.reply !== "string" || !parsed.reply.trim()) {
      parsed.reply = "Let's keep going — tell me a bit more about that.";
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsed),
    };
  } catch (error) {
    console.error("Interview coach error:", error);

    let statusCode = 500;
    if (error.message?.includes("503") || error.message?.includes("overloaded")) {
      statusCode = 503;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: "Failed to get a response from the coach",
        details: error.message,
      }),
    };
  }
};
