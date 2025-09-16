'use client';

import { useMemo, useState } from 'react';

type CompareResp = {
  ok: boolean;
  status: number;
  azure?: any;
  error?: string;
};

type ChatMsg = { role: 'user'|'assistant'; content: string };

export default function Page() {
  // form state
  const [city, setCity] = useState('Tel Aviv');
  const [services, setServices] = useState('General Care');
  const [expertise, setExpertise] = useState('');
  const [topK, setTopK] = useState(5);
  const [urgent, setUrgent] = useState(false);

  // results state
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<CompareResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  // chat state
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  const prettyAzure = useMemo(() => {
    const payload = resp?.azure ?? resp;
    try { return JSON.stringify(payload, null, 2); } catch { return String(payload); }
  }, [resp]);

  async function handleCompare() {
    setLoading(true); setError(null);
    try {
      const body: any = {
        city: city.trim(),
        servicesQuery: services.split(',').map(s => s.trim()).filter(Boolean),
        topK,
        urgent
      };
      if (expertise.trim()) body.expertise = expertise.split(',').map(s => s.trim()).filter(Boolean);

      const r = await fetch('/api/compare', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify(body)
      });
      const json = await r.json().catch(() => ({}));
      setResp({ ok: r.ok, status: r.status, ...json });
      if (!r.ok) setError(json?.detail || 'Request failed');
    } catch (e:any) {
      setError(e?.message || 'Network error');
      setResp({ ok:false, status:0, error: String(e) });
    } finally { setLoading(false); }
  }

  async function sendChat() {
    const msg = chatInput.trim();
    if (!msg || chatBusy) return;
    setChatInput('');
    setChat(c => [...c, { role:'user', content: msg }]);
    setChatBusy(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ message: msg })
      });
      const data = await r.json().catch(() => ({}));
      const text = data?.text || data?.message || JSON.stringify(data);
      setChat(c => [...c, { role:'assistant', content: text }]);
    } catch (e:any) {
      setChat(c => [...c, { role:'assistant', content: `⚠️ ${e?.message || 'Network error'}` }]);
    } finally { setChatBusy(false); }
  }

  return (
    <div className="container">
      <div className="header">
        <div className="brand">Wonder Care — Matching Engine</div>
        <div className="badge">Azure • gpt-5-chat</div>
      </div>

      <div className="card">
        <div className="section"><h3>Client request</h3></div>
        <div className="content">
          <div className="row">
            <input className="input" placeholder="City" value={city} onChange={e=>setCity(e.target.value)} />
            <input className="input" placeholder="Service(s) e.g. General Care, Wound Care"
                   value={services} onChange={e=>setServices(e.target.value)} />
            <input className="input" placeholder="Expertise (comma)" value={expertise} onChange={e=>setExpertise(e.target.value)} />
            <button className="btn" onClick={handleCompare} disabled={loading}>{loading ? 'Comparing…' : 'Compare'}</button>
          </div>
          <div className="kv" style={{marginTop:10}}>
            <label className="switch">
              <input type="checkbox" checked={urgent} onChange={e=>setUrgent(e.target.checked)} />
              Urgent
            </label>
            <span className="switch">TopK</span>
            <input className="input" type="number" min={1} max={20} value={topK}
                   onChange={e=>setTopK(Number(e.target.value||5))} />
            <span className="small">The form calls your local Azure engine at <code>/api/compare</code>.</span>
          </div>
        </div>
      </div>

      <div className="grid" style={{marginTop:18}}>
        {/* LEFT: results */}
        <div className="card">
          <div className="section"><h3>Results</h3></div>
          <div className="content">
            <div className="panels">
              <div>
                <div className="panelTitle">Azure <span className="tag">gpt-5-chat</span></div>
                {!resp && <div className="small">Press <b>Compare</b> to fetch ranked matches.</div>}
                {error && <div className="small" style={{color:'var(--danger)'}}>Error: {error}</div>}
                {resp && (
                  <pre>{prettyAzure}</pre>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: free chat */}
        <div className="card" style={{display:'flex', flexDirection:'column'}}>
          <div className="section"><h3>Conversational matching</h3></div>
          <div className="content chatWrap">
            <div className="chatBox">
              {chat.length === 0 && <div className="small">No messages yet.</div>}
              {chat.map((m, i) => (
                <div key={i} className={`msg ${m.role==='user' ? 'u' : ''}`}>
                  <div className="bubble">{m.content}</div>
                </div>
              ))}
            </div>
            <div className="chatInput">
              <textarea className="textarea" placeholder="Ask anything…" value={chatInput}
                        onChange={e=>setChatInput(e.target.value)}
                        onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendChat(); }}} />
              <button className="btn" onClick={sendChat} disabled={chatBusy || !chatInput.trim()}>
                {chatBusy ? 'Sending…' : 'Send'}
              </button>
            </div>
            <div className="separator"></div>
            <div className="small">Chat sends to <code>/api/chat</code>, which proxies your Azure deployment.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
