import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5555;

// ---- endpoints we call
const AZURE_MATCH_URL = process.env.AZURE_MATCH_URL || "http://localhost:5003/match";
const AZURE_CHAT_URI  = process.env.AZURE_CHAT_URI;   // full chat completions URL
const AZURE_CHAT_KEY  = process.env.AZURE_CHAT_KEY;   // api-key

async function postJSON(url, body, headers = {}) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw:text }; }
  return { ok: r.ok, status: r.status, json };
}

// Compare (Azure only)
app.post("/api/compare", async (req, res) => {
  try {
    const out = await postJSON(AZURE_MATCH_URL, req.body || {});
    res.status(out.status).json(out);
  } catch (e) {
    res.status(500).json({ ok:false, status:0, error:String(e) });
  }
});

// Free chat → Azure GPT-5 chat
app.post("/api/chat", async (req, res) => {
  if (!AZURE_CHAT_URI || !AZURE_CHAT_KEY) {
    return res.status(500).json({ ok:false, error:"Missing AZURE_CHAT_URI or AZURE_CHAT_KEY" });
  }
  const { message, history = [] } = req.body || {};
  const messages = [
    { role: "system", content: "You are a helpful assistant for Wonder's CEO demo." },
    ...history, // [{role:'user'|'assistant', content:'...'}]
    { role: "user", content: String(message || "").trim() || "Hello" }
  ];

  // GPT-5 chat likes messages + max_completion_tokens (no top_p/fancy params)
  const body = { messages, max_completion_tokens: 512 };

  const r = await postJSON(AZURE_CHAT_URI, body, { "api-key": AZURE_CHAT_KEY });
  res.status(r.status).json(r);
});

app.get("/api/health", (_req,res)=>res.json({ok:true}));
app.listen(PORT, () => console.log(`Proxy up on :${PORT}`));
