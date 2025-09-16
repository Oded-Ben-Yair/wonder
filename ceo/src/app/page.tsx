"use client";
import { useState, ChangeEvent } from "react";

type MatchReq = { city?: string; servicesQuery?: string[]; expertise?: string[]; urgent?: boolean; topK?: number; };

export default function Home() {
  const [req, setReq] = useState<MatchReq>({ city:"Tel Aviv", servicesQuery:["General Care"], expertise:[], urgent:false, topK:5 });
  const [resp, setResp] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const r = await fetch("/api/compare", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(req) });
    const j = await r.json(); setResp(j); setLoading(false);
  };

  const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) =>
    <input {...p} style={{padding:8,border:"1px solid #e5e7eb",borderRadius:8}}/>;

  const Card = (p: any) =>
    <div {...p} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:16,flex:1,overflow:"auto"}}/>;

  const handleCity = (e: ChangeEvent<HTMLInputElement>) =>
    setReq({...req, city: e.target.value});

  const handleServices = (e: ChangeEvent<HTMLInputElement>) =>
    setReq({...req, servicesQuery: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)});

  const handleExpertise = (e: ChangeEvent<HTMLInputElement>) =>
    setReq({...req, expertise: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)});

  const handleUrgent = (e: ChangeEvent<HTMLInputElement>) =>
    setReq({...req, urgent: e.target.checked});

  const handleTopK = (e: ChangeEvent<HTMLInputElement>) =>
    setReq({...req, topK: Number(e.target.value)});

  return (
    <div style={{fontFamily:"Inter, system-ui, sans-serif", padding:24, maxWidth:1200, margin:"0 auto"}}>
      <h1 style={{marginBottom:8}}>Wonder — CEO LLM Chooser</h1>
      <p style={{marginTop:0,color:"#6b7280"}}>Enter a client request and compare outputs from the three engines.</p>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, margin:"16px 0"}}>
        <Input placeholder="City" value={req.city||""} onChange={handleCity}/>
        <Input placeholder='Services (comma)' value={req.servicesQuery?.join(", ")||""} onChange={handleServices}/>
        <Input placeholder='Expertise (comma)' value={req.expertise?.join(", ")||""} onChange={handleExpertise}/>
        <label style={{display:"flex",alignItems:"center",gap:8}}>
          <input type="checkbox" checked={!!req.urgent} onChange={handleUrgent}/> Urgent
        </label>
        <Input type="number" min={1} max={10} value={req.topK||5} onChange={handleTopK}/>
        <button onClick={run} disabled={loading} style={{padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8}}>
          {loading ? "Running…" : "Compare"}
        </button>
      </div>

      <div style={{display:"flex", gap:12, minHeight:320}}>
        <Card><h3>Azure</h3><pre style={{whiteSpace:"pre-wrap"}}>{resp?.azure ? JSON.stringify(resp.azure, null, 2) : "—"}</pre></Card>
        <Card><h3>Claude</h3><pre style={{whiteSpace:"pre-wrap"}}>{resp?.claude ? JSON.stringify(resp.claude, null, 2) : "—"}</pre></Card>
        <Card><h3>OpenAI</h3><pre style={{whiteSpace:"pre-wrap"}}>{resp?.openai ? JSON.stringify(resp.openai, null, 2) : "—"}</pre></Card>
      </div>
    </div>
  );
}
