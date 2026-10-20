const { GoogleGenerativeAI } = require("@google/generative-ai");
const busboy = require("busboy");
const { HttpError } = require("../lib/http.cjs");
const { optionalUser } = require("../lib/auth.cjs");
const { assertCanGenerate, recordGeneration } = require("../lib/quota.cjs");
const { connectBlobs } = require("../lib/store.cjs");

const MODEL_ID = "gemini-2.5-flash-lite";

const SYSTEM_PROMPT = `You are an expert career consultant and professional writer specializing in job applications. Analyze job descriptions and candidate materials to deliver polished, ready-to-use documents that can be rendered directly in a web client.

## Deliverables
Generate three outputs based on the provided inputs:

1. **Cover Letter**
   - Personalized, professional, and role-specific
   - 250-400 words in a tone that matches the target company
   - Human, conversational language; avoid sounding robotic or generic

2. **Optimized CV (Styled HTML String)**
   - You MUST generate a valid HTML string based on the exact template provided below.
   - All styles are already defined in the \`<style>\` block. Do NOT add new inline styles or classes.
   - The template is a structural guide. ADAPT IT to the candidate's specific information.
   - DYNAMIC CONTENT RULE: If the candidate has three prior jobs, you must generate three \`div.experience-item\` blocks. If they have one job, generate only one. The same logic applies to education, skills, etc.
   - OMISSION RULE: If the candidate's data does not contain information for a specific section (e.g., no "Interests" are provided), you MUST omit the entire section, including its \`h2.section-title\` heading.
   - CONTENT RULE: While adhering to the structure, you must still optimize the content. Rewrite bullet points to be action-oriented (using the STAR method where possible) and tailor the language to the target job description.
   - CLEANUP RULE: Ensure no unused placeholders like \`{{PLACEHOLDER}}\` are left in the final HTML.

## Golden CV Template
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Crimson Pro', Georgia, serif; line-height: 1.6; color: #1a1a1a; background: #ffffff; padding: 0; }
    .container { max-width: 8.5in; margin: 0 auto; padding: 0.75in 0.75in 0.6in; }
    .header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 28px; }
    .name { font-size: 32px; font-weight: 700; letter-spacing: 2px; margin-bottom: 8px; color: #000; }
    .contact-info { font-size: 12px; color: #333; font-family: 'Inter', sans-serif; }
    .contact-info span { margin: 0 8px; }
    .section { margin-bottom: 26px; }
    .section-title { font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 6px; margin-bottom: 14px; color: #000; }
    .section-content { font-size: 13px; line-height: 1.65; color: #1a1a1a; }
    .experience-item { margin-bottom: 20px; page-break-inside: avoid; }
    .experience-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
    .job-title { font-size: 13px; font-weight: 700; color: #000; }
    .date-location { font-size: 12px; color: #333; font-style: italic; font-family: 'Inter', sans-serif; }
    .company { font-size: 12px; font-style: italic; color: #333; margin-bottom: 8px; }
    .responsibilities { list-style: none; padding-left: 0; }
    .responsibilities li { font-size: 12px; line-height: 1.6; margin-bottom: 6px; padding-left: 14px; position: relative; color: #1a1a1a; }
    .responsibilities li::before { content: '⋄'; position: absolute; left: 0; color: #000; font-size: 10px; }
    .education-item { margin-bottom: 18px; page-break-inside: avoid; }
    .degree { font-size: 13px; font-weight: 700; color: #000; margin-bottom: 2px; }
    .school { font-size: 12px; font-style: italic; color: #333; margin-bottom: 6px; }
    .education-details { font-size: 12px; line-height: 1.6; color: #1a1a1a; padding-left: 14px; }
    .skill-item { margin-bottom: 8px; font-size: 12px; line-height: 1.6; }
    .skill-item strong { color: #000; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header: Populate with candidate's details -->
    <div class="header">
      <h1 class="name">CANDIDATE NAME</h1>
      <div class="contact-info">
        <span>📍 LOCATION</span>
        <span>•</span>
        <span>📞 PHONE</span>
        <span>•</span>
        <span>✉ EMAIL</span>
        <span>•</span>
        <span>🔗 LINKEDIN/PORTFOLIO</span>
      </div>
    </div>
    <!-- Executive Summary: Tailor to the job description -->
    <div class="section">
      <h2 class="section-title">Executive Summary</h2>
      <div class="section-content">
        A concise, powerful summary of the candidate's qualifications for THIS specific role.
      </div>
    </div>
    <!-- Professional Experience: Generate one item per relevant job -->
    <div class="section">
      <h2 class="section-title">Professional Experience</h2>
      <div class="experience-item">
        <div class="experience-header">
          <span class="job-title">Job Title</span>
          <span class="date-location">Dates | Location</span>
        </div>
        <div class="company">Company Name</div>
        <ul class="responsibilities">
          <li>Action-oriented bullet point tailored to the job description.</li>
          <li>Another achievement-focused bullet point.</li>
        </ul>
      </div>
    </div>
    <!-- Education: Generate one item per degree/certification -->
    <div class="section">
      <h2 class="section-title">Education</h2>
      <div class="education-item">
        <div class="degree">Degree or Certification</div>
        <div class="school">Institution • Location • Dates</div>
        <div class="education-details">
          Optional: Relevant coursework, honors, etc.
        </div>
      </div>
    </div>
    <!-- Skills: Categorize skills from the candidate's profile -->
    <div class="section">
      <h2 class="section-title">Skills</h2>
      <div class="skill-item">
        <strong>Category (e.g., Technical Skills):</strong> List of skills.
      </div>
    </div>
  </div>
</body>
</html>
\`\`\`

3. **Strategic Insights**
   - Key keywords, culture fit, interview questions
   - Also fill \`jobSummary\` at the top level: the hiring company's name, the role title, and the location exactly as the job description states them (empty string when genuinely absent). Never guess a company name.
   - A **Fit Assessment**: an honest read of how well this candidate matches this role.
     - \`matchScore\` is 0-100 and must be computed, not felt, so it is reproducible. Work through this rubric before writing anything else in the assessment:
       1. List the job's hard requirements (mandatory items). Mark each as met (clear evidence in the materials), partial (adjacent or weaker evidence), or unmet. Hard coverage = (met + 0.5 × partial) / total.
       2. Do the same for preferred / nice-to-have items. Preferred coverage = (met + 0.5 × partial) / total (use 1.0 if the job lists none).
       3. Seniority and domain: 1.0 if years of experience and domain match the role, 0.5 if one of them is a stretch, 0 if both are.
       Report those tallies in \`rubric\` (integer counts; \`seniorityDomain\` is 1, 0.5 or 0; \`nonNegotiableUnmet\` is true when a requirement the job calls mandatory/non-negotiable is unmet). The server computes \`matchScore\` from the rubric as round(100 × (0.65 × hard coverage + 0.15 × preferred coverage + 0.20 × seniorityDomain)), capped at 59 when \`nonNegotiableUnmet\` is true — still fill in your own \`matchScore\` with that same formula as a cross-check.
     - \`recommendation\` follows from the score: 85-100 = \`"strong fit"\`, 60-84 = \`"reach"\`, 0-59 = \`"pass"\`. Do not inflate to be kind; a candid 55 with a clear path to 80 is more useful than a flattering 70.
     - \`strengths\` cite concrete evidence from the candidate's materials that maps to a stated requirement. \`gaps\` name requirements the materials do not demonstrate; be specific, and say when a gap is likely a hard blocker.
     - \`keywordOverlap.matched\` are important terms from the job description that the candidate's materials genuinely support; \`keywordOverlap.missing\` are important terms they do not.

## JSON Contract (OUTPUT MUST MATCH EXACTLY)
Return a valid JSON object that adheres to the schema below.

\`\`\`json
{
  "coverLetter": "Full cover letter text...",
  "cvHtml": "<!DOCTYPE html><html>...</html>",
  "jobSummary": {
    "company": "Hiring company name",
    "title": "Role title",
    "location": "City, Country or Remote"
  },
  "strategicInsights": {
    "keyKeywords": [
      "Top keyword 1",
      "Top keyword 2",
      "Top keyword 3",
      "Top keyword 4",
      "Top keyword 5"
    ],
    "cultureFit": "1-2 sentence summary of inferred culture and tone",
    "interviewQuestions": [
      "Thoughtful question about the role",
      "Question about team or company challenges",
      "Question about success metrics or direction"
    ],
    "fitAssessment": {
      "rubric": {
        "hard": { "met": 4, "partial": 2, "unmet": 2 },
        "preferred": { "met": 1, "partial": 0, "unmet": 2 },
        "seniorityDomain": 0.5,
        "nonNegotiableUnmet": false
      },
      "matchScore": 72,
      "recommendation": "reach",
      "summary": "1-2 honest sentences on overall fit and what would tip the decision",
      "strengths": [
        "Concrete strength tied to a stated requirement",
        "Another"
      ],
      "gaps": [
        "Specific requirement the materials do not demonstrate",
        "Another"
      ],
      "keywordOverlap": {
        "matched": ["term present in both"],
        "missing": ["important term the candidate lacks"]
      }
    }
  }
}
\`\`\`

## Rules
- Strictly follow the JSON contract; do not include additional keys, explanatory text, or Markdown.
- Return the complete, raw HTML document in \`cvHtml\` based on the provided template. Do not add extra styles or classes.
- Extract contact details meticulously; prefer candidate-provided data over job description data.
- Never fabricate degrees, company names, or dates that contradict provided materials; make the best good-faith inference otherwise.
- If specific details are missing, omit that element or section rather than inventing data.`;

const RECOMMENDATIONS = ["strong fit", "reach", "pass"];

const toStringList = (value) =>
  Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : typeof value === "string" && value.trim()
    ? [value.trim()]
    : [];

const toCount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

const normalizeTally = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const met = toCount(raw.met);
  const partial = toCount(raw.partial);
  const unmet = toCount(raw.unmet);
  if (met === null || partial === null || unmet === null) return null;
  return { met, partial, unmet, total: met + partial + unmet };
};

const coverage = (tally) => (tally && tally.total > 0 ? (tally.met + 0.5 * tally.partial) / tally.total : null);

/**
 * Deterministic score from the model's rubric tallies. Returns null when the rubric is unusable so
 * the caller can fall back to the model's own number.
 */
const scoreFromRubric = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const hard = normalizeTally(raw.hard);
  const hardCoverage = coverage(hard);
  if (hardCoverage === null) return null; // no hard requirements tallied → can't score
  const preferred = normalizeTally(raw.preferred);
  const preferredCoverage = coverage(preferred) ?? 1; // job lists no preferred items
  const sd = Number(raw.seniorityDomain);
  const seniorityDomain = [0, 0.5, 1].includes(sd) ? sd : sd >= 0.75 ? 1 : sd >= 0.25 ? 0.5 : 0;
  const nonNegotiableUnmet = raw.nonNegotiableUnmet === true;
  let score = Math.round(100 * (0.65 * hardCoverage + 0.15 * preferredCoverage + 0.2 * seniorityDomain));
  if (nonNegotiableUnmet) score = Math.min(score, 59);
  return {
    score: Math.max(0, Math.min(100, score)),
    rubric: { hard, preferred, seniorityDomain, nonNegotiableUnmet },
  };
};

// Coerce the model's fit assessment into a predictable shape, or null if unusable.
const normalizeFitAssessment = (raw) => {
  if (!raw || typeof raw !== "object") return null;

  // Prefer the server-computed rubric score (reproducible); fall back to the model's number.
  const computed = scoreFromRubric(raw.rubric);
  const modelScore = Number(raw.matchScore);
  const matchScore =
    computed?.score ?? (Number.isFinite(modelScore) ? Math.max(0, Math.min(100, Math.round(modelScore))) : null);

  // The recommendation always follows the (possibly recomputed) score.
  const recommendation =
    matchScore === null
      ? RECOMMENDATIONS.includes(String(raw.recommendation).trim().toLowerCase())
        ? String(raw.recommendation).trim().toLowerCase()
        : ""
      : matchScore >= 85
      ? "strong fit"
      : matchScore >= 60
      ? "reach"
      : "pass";

  if (matchScore === null && !recommendation) return null;

  return {
    matchScore,
    recommendation,
    rubric: computed?.rubric || null,
    summary: typeof raw.summary === "string" ? raw.summary.trim() : "",
    strengths: toStringList(raw.strengths),
    gaps: toStringList(raw.gaps),
    keywordOverlap: {
      matched: toStringList(raw.keywordOverlap?.matched),
      missing: toStringList(raw.keywordOverlap?.missing),
    },
  };
};

const cleanString = (value, max = 160) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const normalizeJobSummary = (raw) => ({
  company: cleanString(raw?.company),
  title: cleanString(raw?.title),
  location: cleanString(raw?.location),
});

const parseMultipartForm = (event) => {
  return new Promise((resolve, reject) => {
    try {
      const fields = {};
      const files = {};

      const bb = busboy({ headers: event.headers });

      bb.on("file", (name, file, info) => {
        const { filename, mimeType } = info;
        const chunks = [];
        file.on("data", (chunk) => chunks.push(chunk));
        file.on("end", () => {
          if (!files[name]) {
            files[name] = [];
          }
          files[name].push({
            filename,
            mimeType,
            buffer: chunks.length ? Buffer.concat(chunks) : null,
          });
        });
      });

      bb.on("field", (name, val) => {
        fields[name] = val;
      });

      bb.on("close", () => resolve({ fields, files }));

      const bodyBuffer = Buffer.from(
        event.body,
        event.isBase64Encoded ? "base64" : "utf8"
      );
      bb.end(bodyBuffer);
    } catch (err) {
      reject(err);
    }
  });
};

// Helper function for retry logic
const retryRequest = async (fn, retries = 3, delay = 500) => {
  try {
    return await fn();
  } catch (error) {
    console.log(`Caught error - status: ${error.status}, message: ${error.message?.substring(0, 100)}`);

    const shouldRetry =
      error.status === 429 ||
      error.status === 503 ||
      error.message?.includes("429") ||
      error.message?.includes("503") ||
      error.message?.includes("Rate limit") ||
      error.message?.includes("overloaded");

    if (shouldRetry && retries > 0) {
      console.log(
        `Retrying API call. Error status: ${error.status}. Waiting ${delay}ms. Attempts left: ${retries}`
      );
      await new Promise((res) => setTimeout(res, delay));
      return retryRequest(fn, retries - 1, delay * 2);
    }

    console.log(`Not retrying. shouldRetry: ${shouldRetry}, retries: ${retries}`);
    throw error;
  }
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

  // Sign-in required once GOOGLE_CLIENT_ID is configured: generation costs money and the
  // quota is per user per month. Unconfigured deployments run anonymously (see optionalUser).
  let user = null;
  try {
    connectBlobs(event);
    user = optionalUser(event);
    if (user) await assertCanGenerate(user.sub);
  } catch (err) {
    if (err instanceof HttpError) return { ...err.toResponse(), headers: { ...headers, "Content-Type": "application/json" } };
    console.error("Auth/quota check failed:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Could not verify your account", details: err.message }) };
  }

  try {
    const { fields, files } = await parseMultipartForm(event);
    const { jobData } = fields;

    const normalizeFiles = (input) => {
      if (!input) return [];
      if (Array.isArray(input)) {
        return input.filter((entry) => entry?.buffer);
      }
      return input?.buffer ? [input] : [];
    };

    const profileUploads = normalizeFiles(files?.profileFile);
    const jobUploads = normalizeFiles(files?.jobFile);

    const trimmedJobData =
      typeof jobData === "string" ? jobData.trim() : "";

    if (!trimmedJobData && jobUploads.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing job data" }),
      };
    }

    if (profileUploads.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing file upload" }),
      };
    }

    if (profileUploads.length > 5 || jobUploads.length > 5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "A maximum of 5 files is supported for profile and job uploads" }),
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Lower temperature keeps the fit assessment reproducible run to run; the documents stay
    // varied enough because the inputs themselves differ per application.
    const model = genAI.getGenerativeModel(
      { model: MODEL_ID, generationConfig: { temperature: 0.4 } },
      { apiVersion: 'v1' }
    );

    const resolvedJobText = trimmedJobData;

    const promptParts = [
      { text: SYSTEM_PROMPT },
      {
        text: "I understand. I will analyze the user's uploaded resume and the provided job description.",
      },
    ];

    if (resolvedJobText) {
      promptParts.push({
        text: `## Job Description (user input):\n${resolvedJobText}`,
      });
    } else if (jobUploads.length > 0) {
      promptParts.push({
        text: "## Job Description:\nThe full job description is available in the attached files below. Please read them directly.",
      });
    }

    if (jobUploads.length > 0) {
      promptParts.push({
        text: "## Attached Job Description Files",
      });
      jobUploads.forEach((file, index) => {
        promptParts.push({
          text: `### Job File ${index + 1}: ${file.filename || `job-${index + 1}`}`,
        });
        promptParts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.buffer.toString("base64"),
          },
        });
      });
    }

    promptParts.push({
      text: "## Candidate Resume Uploads",
    });
    profileUploads.forEach((file, index) => {
      promptParts.push({
        text: `### Resume File ${index + 1}: ${file.filename || `resume-${index + 1}`}`,
      });
      promptParts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.buffer.toString("base64"),
        },
      });
    });

    const result = await retryRequest(() =>
      model.generateContent({ contents: [{ role: "user", parts: promptParts }] }),
      5,
      1000
    );
    const response = await result.response;
    const responseText = response?.text?.();

    if (!responseText) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "No content generated" }),
      };
    }

    let parsedContent;
    try {
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : responseText;
      parsedContent = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      console.error("Raw response:", responseText);
      parsedContent = {
        coverLetter: responseText,
        cvHtml:
          '<div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">Unable to parse structured CV HTML from the model response.</div>',
        strategicInsights: {
          keyKeywords: [],
          cultureFit: "",
          interviewQuestions: [],
          fitAssessment: null,
        },
      };
    }

    if (typeof parsedContent?.cvHtml !== "string") {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Model response missing cvHtml data" }),
      };
    }
    const insights = parsedContent.strategicInsights || {};
    const responsePayload = {
      coverLetter: parsedContent.coverLetter,
      cvHtml: parsedContent.cvHtml,
      jobSummary: normalizeJobSummary(parsedContent.jobSummary),
      strategicInsights: {
        keyKeywords: insights.keyKeywords || [],
        cultureFit: insights.cultureFit || "",
        interviewQuestions: insights.interviewQuestions || [],
        fitAssessment: normalizeFitAssessment(insights.fitAssessment),
      },
    };

    if (user) {
      try {
        responsePayload.quota = await recordGeneration(user.sub);
      } catch (quotaErr) {
        console.error("Failed to record generation usage:", quotaErr);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responsePayload),
    };
  } catch (error) {
    console.error("Error processing request:", error);

    let statusCode = 500;
    if (error.message?.includes("status 503") || error.message?.includes("overloaded")) {
      statusCode = 503;
    } else if (error.message?.includes("status 504")) {
      statusCode = 504;
    } else if (error.message?.includes("status 502")) {
      statusCode = 502;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: "Failed to process request",
        details: error.message,
      }),
    };
  }
};
