import axios from "axios";
import http from "http";
import https from "https";

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100 });

const AXIOS = axios.create({
  timeout: 90_000,
  httpAgent,
  httpsAgent,
  // treat 429 and any 5xx as retryable; other 4xx as errors
  validateStatus: (s) => (s >= 200 && s < 300) || s === 429 || (s >= 500 && s < 600),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "llm-matching/1.0"
  }
});

/**
 * Exponential backoff helper
 */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Extract text from Azure Responses API payload in a tolerant way.
 * Supports:
 *  - data.output (Responses API format)
 *  - data.choices[0].message.content (Chat Completions format fallback)
 *  - data.choices[0].text (alternative format)
 *  - string bodies (last resort)
 */
function extractText(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  
  // Responses API format
  if (data.output && typeof data.output === "string") {
    return data.output.trim();
  }
  
  // Chat Completions format fallback
  if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
    const choice = data.choices[0];
    if (choice.message && typeof choice.message.content === "string") {
      return choice.message.content.trim();
    }
    if (typeof choice.text === "string") {
      return choice.text.trim();
    }
  }
  
  return JSON.stringify(data);
}

/**
 * Call Azure OpenAI API with retries on 429/5xx and optional AbortSignal.
 * Supports both Chat Completions (messages) and Responses API (input) formats.
 */
export async function azureRespond({ uri, apiKey, messages, input, temperature = 0.2, top_p = 0.9, max_tokens = 192, reasoning_effort = 'minimal', abortSignal }) {
  if (!uri || !apiKey) throw new Error("azureRespond: missing uri or apiKey");

  // Determine API format based on endpoint and parameters
  let body;
  if (messages) {
    // Chat Completions API format (GPT-5 uses max_completion_tokens)
    // GPT-5 only supports temperature=1, no top_p
    // Add reasoning_effort for GPT-5 to control reasoning token usage
    body = {
      messages,
      max_completion_tokens: max_tokens,
      reasoning_effort: reasoning_effort
    };
  } else if (input) {
    // Responses API format
    body = {
      input: input,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5',
      temperature,
      top_p,
      max_tokens
    };
  } else {
    throw new Error("azureRespond: must provide either messages or input");
  }

  let attempt = 0;
  const maxAttempts = 5; // initial + 4 retries
  let lastErr;

  while (attempt < maxAttempts) {
    try {
      const res = await AXIOS.post(uri, body, {
        headers: { 
          "api-key": apiKey,
          "Content-Type": "application/json"
        },
        signal: abortSignal
      });

      if (res.status >= 200 && res.status < 300) {
        console.log('Azure API raw response:', JSON.stringify(res.data));
        return { ok: true, text: extractText(res.data), raw: res.data, status: res.status };
      }

      // Retryable statuses: 429 + 5xx
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        attempt++;
        if (attempt >= maxAttempts) {
          return { ok: false, error: `Azure error ${res.status}: ${JSON.stringify(res.data)}`, status: res.status };
        }
        // Respect Retry-After (seconds) if present; otherwise capped backoff
        const retryAfterHeader = res.headers?.["retry-after"];
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;
        const backoffMs = retryAfterMs && !Number.isNaN(retryAfterMs)
          ? Math.min(retryAfterMs, 5_000)
          : Math.min(250 * 2 ** (attempt - 1), 5_000);
        await sleep(backoffMs);
        continue;
      }

      // Non-retryable 4xx (except 429)
      console.error(`Azure 4xx error details:`, res.status, JSON.stringify(res.data));
      console.error(`Request URI was:`, uri);
      console.error(`Request headers:`, res.config.headers);
      console.error(`Request body was:`, JSON.stringify(body).substring(0, 500));
      const errorMsg = res.data?.error?.message || JSON.stringify(res.data);
      return { ok: false, error: `Azure non-retryable ${res.status}: ${errorMsg}`, status: res.status };
    } catch (err) {
      lastErr = err;
      // Log detailed error information for debugging
      console.error('Azure request failed with error:', err.message);
      if (err.response) {
        console.error('Error response status:', err.response.status);
        console.error('Error response data:', JSON.stringify(err.response.data));
        console.error('Error response headers:', err.response.headers);
      }
      attempt++;
      if (attempt >= maxAttempts) {
        return { ok: false, error: `Azure request failed: ${err?.message || String(err)}`, status: err?.response?.status || 0 };
      }
      // network error backoff
      const backoffMs = Math.min(300 * 2 ** (attempt - 1), 5_000);
      await sleep(backoffMs);
    }
  }

  return { ok: false, error: `Azure request failed after retries: ${lastErr?.message || String(lastErr)}`, status: 0 };
}