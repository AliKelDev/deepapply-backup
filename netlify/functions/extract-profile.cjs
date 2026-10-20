const { GoogleGenerativeAI } = require("@google/generative-ai");
const { HttpError } = require("../lib/http.cjs");
const { optionalUser } = require("../lib/auth.cjs");
const busboy = require("busboy");

const MODEL_ID = "gemini-2.5-flash-lite";

const EXTRACTION_PROMPT = `You are a profile extraction assistant. Analyze the provided CV, resume, or LinkedIn profile text and extract structured information.

Extract and return a JSON object with the following structure. If any field is not found or cannot be determined, use an empty string or empty array as appropriate.

## JSON Schema:
\`\`\`json
{
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "location": "string (City, State/Country)",
  "linkedinUrl": "string",
  "websiteUrl": "string",
  "githubUrl": "string",
  "currentTitle": "string",
  "yearsOfExperience": "string (just the number or range, e.g., '5' or '3-5')",
  "professionalSummary": "string (2-4 sentences summarizing their career)",
  "workExperience": [
    {
      "company": "string",
      "role": "string",
      "duration": "string (e.g., 'Jan 2020 - Present' or '2020-2023')",
      "description": "string (key responsibilities and achievements, 2-4 sentences)"
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string (e.g., 'Bachelor of Science', 'Master of Arts')",
      "field": "string (e.g., 'Computer Science', 'Business Administration')",
      "graduationYear": "string (e.g., '2020' or '2018-2020')"
    }
  ],
  "technicalSkills": "string (comma-separated list)",
  "languages": "string (comma-separated with proficiency, e.g., 'English (Native), Spanish (Fluent)')",
  "certifications": "string (one per line or comma-separated)",
  "additionalInfo": "string (anything else relevant: publications, volunteer work, awards, etc.)"
}
\`\`\`

## Rules:
1. Extract information accurately from the provided text
2. Do not fabricate information that isn't present
3. If a section is not found, use empty string "" or empty array []
4. For workExperience, list jobs in reverse chronological order (most recent first)
5. For education, list degrees in reverse chronological order
6. Be smart about inferring location and years of experience from context
7. Return ONLY valid JSON, no additional text or markdown code blocks
8. If you see social media links, extract them appropriately (LinkedIn, GitHub, personal website)`;

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

  try {
    optionalUser(event);
  } catch (err) {
    if (err instanceof HttpError) return { ...err.toResponse(), headers: { ...headers, "Content-Type": "application/json" } };
    throw err;
  }

  try {
    const { fields, files } = await parseMultipartForm(event);
    const { rawText } = fields;
    const uploadedFiles = Array.isArray(files?.file)
      ? files.file.filter((entry) => entry?.buffer)
      : [];

    // Must have either a file or raw text
    if (uploadedFiles.length === 0 && !rawText) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing file or text input" }),
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
    const model = genAI.getGenerativeModel(
      { model: MODEL_ID },
      { apiVersion: 'v1' }
    );

    const promptParts = [
      { text: EXTRACTION_PROMPT },
      {
        text: "I understand. I will extract structured profile information from the provided content and return valid JSON.",
      },
    ];

    // If raw text is provided, use it
    if (rawText) {
      promptParts.push({
        text: `## Profile Data to Extract:\n${rawText}`,
      });
    }

    // If file is provided, add it so the model can read the source directly
    if (uploadedFiles.length > 0) {
      if (uploadedFiles.length > 5) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "A maximum of 5 files is supported per request" }),
        };
      }

      promptParts.push({
        text: "## Uploaded Resume Files",
      });

      uploadedFiles.forEach((entry, index) => {
        promptParts.push({
          text: `### Resume File ${index + 1}: ${entry.filename || `resume-${index + 1}`}`,
        });
        promptParts.push({
          inlineData: {
            mimeType: entry.mimeType,
            data: entry.buffer.toString("base64"),
          },
        });
      });
    }

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

    let parsedProfile;
    try {
      // Try to extract JSON from markdown code blocks or parse directly
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : responseText;
      parsedProfile = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      console.error("Raw response:", responseText.substring(0, 500));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to parse AI response",
          details: parseError.message
        }),
      };
    }

    // Validate the response has the expected structure
    const requiredFields = ['fullName', 'email', 'workExperience', 'education'];
    const hasValidStructure = requiredFields.every(field => field in parsedProfile);

    if (!hasValidStructure) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "AI response missing required fields" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsedProfile),
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
