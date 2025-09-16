import { NextRequest } from 'next/server';

const TARGET = process.env.AZURE_MATCH_URL || 'http://localhost:5003/match';

// Cities — extend as needed
const CITIES = [
  'Tel Aviv','Jerusalem','Haifa','Beer Sheva','Rishon LeTsiyon','Rishon',
  'Netanya','Ashdod','Ramat Gan','Bat Yam','Herzliya','Holon','Bnei Brak',
  'Raanana','Beer Yaakov'
];

// Canonical services your /match engine supports
const CANON = [
  'General Care','Wound Care','Medication Administration','Pediatric Care',
  'Hospital Care','Home Care','Day Night','Post-Surgery Care',
  'Geriatric Care','Emergency Care','IV Therapy','Catheter Care'
];

// Keyword buckets (phrases -> service). Use simple, safe matching.
const KEYWORDS: Record<string, string[]> = {
  'General Care': [
    'general care','general','care','basic care'
  ],
  'Wound Care': [
    'wound','bandage','dressing','ulcer','pressure ulcer'
  ],
  'Medication Administration': [
    'medication','medicine','pill','pills','dose','dosing'
  ],
  'Pediatric Care': [
    'pediatric','child','children','kid','kids','baby','infant'
  ],
  'Hospital Care': [
    'hospital','inpatient','ward'
  ],
  'Home Care': [
    'home care','home visit','house call','house'
  ],
  'Day Night': [
    'day night','overnight','night shift','night care' // 24/7 handled separately
  ],
  'Post-Surgery Care': [
    'post surgery','post-surgery','recovery','after surgery'
  ],
  'Geriatric Care': [
    'geriatric','elder','elderly','senior','seniors'
  ],
  'Emergency Care': [
    'emergency','urgent','asap','now'
  ],
  'IV Therapy': [
    'iv','infusion','drip'
  ],
  'Catheter Care': [
    'catheter','urinary catheter','foley'
  ],
};

// Helpers
function hasWord(text: string, phrase: string): boolean {
  // word-boundary match for phrases (split into words)
  const escaped = phrase.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = new RegExp(`\\b${escaped}\\b`, 'i');
  return rx.test(text);
}

function pickCity(text: string): string | null {
  const t = ` ${text.toLowerCase()} `;
  for (const c of CITIES) {
    if (t.includes(` ${c.toLowerCase()} `)) return c;
  }
  return null;
}

function dedupe<T>(arr: T[]) { return Array.from(new Set(arr)); }

function pickServices(text: string): string[] {
  const t = text.toLowerCase();
  const found: string[] = [];

  // special handling for "24/7"
  if (t.includes('24/7') || t.includes('24x7') || t.includes('24-7')) {
    found.push('Day Night');
  }

  for (const [service, phrases] of Object.entries(KEYWORDS)) {
    for (const p of phrases) {
      if (hasWord(text, p)) { found.push(service); break; }
    }
  }

  // direct canonical mentions
  for (const c of CANON) if (hasWord(text, c)) found.push(c);

  return dedupe(found);
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const raw = String(message || '').trim();
    if (!raw) return new Response(JSON.stringify({ error:'Empty message' }), { status:400 });

    const text = raw;
    const city = pickCity(text) || 'Tel Aviv';
    let servicesQuery = pickServices(text);

    // avoid accidental "iv" from "Aviv"/"evening"
    if (servicesQuery.includes('IV Therapy') && !(/\biv\b/i.test(text) || /\binfusion\b/i.test(text) || /\bdrip\b/i.test(text))) {
      servicesQuery = servicesQuery.filter(s => s !== 'IV Therapy');
    }

    if (servicesQuery.length === 0) servicesQuery = ['General Care'];

    const m = text.match(/\btop\s*(\d{1,2})\b/i);
    const topK = m ? Math.max(1, Math.min(10, Number(m[1]))) : 5;
    const urgent = /\burgent\b|\bnow\b|\basap\b/i.test(text);

    const body = { city, servicesQuery, topK, urgent };

    const r = await fetch(TARGET, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const raw = await r.text().catch(()=>'');
      return new Response(JSON.stringify({
        error: 'Engine error',
        status: r.status,
        detail: raw.slice(0,500),
        used: body
      }), { status: 502 });
    }

    const json = await r.json();
    return new Response(
      JSON.stringify({ text: 'OK', results: json, used: body }),
      { headers: { 'content-type':'application/json' } }
    );
  } catch (e:any) {
    return new Response(JSON.stringify({ error:'fetch failed', detail:String(e) }), { status:500 });
  }
}
