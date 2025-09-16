import { NextRequest } from 'next/server';

const TARGET = process.env.AZURE_MATCH_URL || 'http://localhost:5003/match';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const r = await fetch(TARGET, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return new Response(JSON.stringify({ ok: r.ok, status: r.status, azure: json }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, status: 0, error: String(e?.message || e) }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  }
}
