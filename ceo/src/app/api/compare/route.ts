export const runtime = 'nodejs';

async function pipe(url: string, body: any) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const txt = await r.text();
    try { return { ok: r.ok, status: r.status, json: JSON.parse(txt) }; }
    catch { return { ok: r.ok, status: r.status, json: { raw: txt } }; }
  } catch (err: any) {
    return { ok: false, status: 0, error: String(err) };
  }
}

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  const AZURE_URL  = process.env.AZURE_MATCH_URL  || "http://localhost:5003/match";
  const CLAUDE_URL = process.env.CLAUDE_MATCH_URL || "http://localhost:5103/match";
  const OPENAI_URL = process.env.OPENAI_MATCH_URL || "http://localhost:5203/match";

  const [azure, claude, openai] = await Promise.allSettled([
    pipe(AZURE_URL, payload),
    pipe(CLAUDE_URL, payload),
    pipe(OPENAI_URL, payload),
  ]);

  return Response.json({
    azure : azure.status  === "fulfilled" ? azure.value  : { ok:false, error:String(azure.reason) },
    claude: claude.status === "fulfilled" ? claude.value : { ok:false, error:String(claude.reason) },
    openai: openai.status === "fulfilled" ? openai.value : { ok:false, error:String(openai.reason) },
  });
}
