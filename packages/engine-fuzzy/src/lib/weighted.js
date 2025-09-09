import Fuse from 'fuse.js';
import { distanceKm, availabilityOverlapRatio } from '@wonder/shared-utils';

const DEFAULT_WEIGHTS = { services:0.3, expertise:0.3, location:0.2, availability:0.2 };

export function weightedMatch(query, nurses){
  const {
    servicesQuery = [], expertiseQuery = [], city, start, end,
    lat, lng, maxDistanceKm = 50, topK = 10, urgent = false,
    weights = DEFAULT_WEIGHTS
  } = query || {};

  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const day = s ? ['sun','mon','tue','wed','thu','fri','sat'][s.getUTCDay()] : null;

  const pre = (nurses||[]).filter(n => {
    if (!city) return true;
    const cityLower = String(city).toLowerCase();
    // Check municipality array for match
    return (n.municipality || []).some(muni => 
      muni.toLowerCase().includes(cityLower) || 
      cityLower.includes(muni.toLowerCase())
    );
  });

  const fuseOptions = { includeScore: true, threshold: 0.4 };

  const scored = pre.map(n => {
    // services fuzzy - use specialization field
    let serviceScore = 0;
    const nurseServices = n.specialization || n.services || [];
    if(Array.isArray(servicesQuery) && servicesQuery.length && Array.isArray(nurseServices) && nurseServices.length){
      const f = new Fuse(nurseServices.map(x=>({t:x})), { ...fuseOptions, keys:['t'] });
      const arr = servicesQuery.map(q => {
        const r = f.search(String(q));
        return r.length ? 1 - Math.min(1, r[0].score ?? 1) : 0;
      });
      serviceScore = arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
    }

    // expertise jaccard - also use specialization if no expertiseTags
    let expertiseScore = 0;
    const nurseTags = n.expertiseTags || n.specialization || [];
    if(Array.isArray(expertiseQuery) && expertiseQuery.length && Array.isArray(nurseTags) && nurseTags.length){
      const rq = new Set(expertiseQuery.map(x=>String(x).toLowerCase()));
      const nt = new Set(nurseTags.map(x=>String(x).toLowerCase()));
      const inter = [...rq].filter(x=>nt.has(x)).length;
      const union = new Set([...rq, ...nt]).size || 1;
      expertiseScore = inter/union;
    }

    // availability
    const avail = (s&&e) ? availabilityOverlapRatio(s,e,n.availability,day) : 1;

    // location
    const dKm = (lat!=null&&lng!=null&&n.lat!=null&&n.lng!=null) ? distanceKm(lat,lng,n.lat,n.lng) : null;
    const location = (dKm==null) ? 0.5 : Math.max(0, 1 - (dKm/(maxDistanceKm||50)));

    let score = (weights.services*serviceScore) + (weights.expertise*expertiseScore) + (weights.availability*avail) + (weights.location*location);

    const hoursToStart = s ? (s - new Date())/36e5 : null;
    const isUrgent = urgent === true || (hoursToStart!=null && hoursToStart < 24);
    if(isUrgent) score *= 1.10;

    score = Math.max(0, Math.min(1, score));

    const reason = [
      serviceScore>0?`services≈${(serviceScore*100)|0}%`:null,
      expertiseScore>0?`expertise≈${(expertiseScore*100)|0}%`:null,
      avail>0?`availability≈${(avail*100)|0}%`:null,
      dKm!=null?`distance≈${dKm.toFixed(1)}km`:null,
      isUrgent?`urgent +10%`:null
    ].filter(Boolean).join(' · ');

    return { 
      id: n.nurseId || n.id, 
      name: n.name || `Nurse ${n.nurseId?.substring(0,8)}`, 
      city: n.municipality?.[0] || n.city || 'Unknown',
      municipality: n.municipality,
      specialization: n.specialization,
      score, 
      reason, 
      meta: { serviceScore, expertiseScore, availabilityRatio:avail, distanceKm:dKm, rating:n.rating, reviewsCount:n.reviewsCount } 
    };
  });

  // Stable sort: by score, then by id for deterministic results
  const sorted = scored.sort((a, b) => {
    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    // Tie-break by id for consistent ordering
    return a.id < b.id ? -1 : 1;
  });
  return sorted.slice(0, topK);
}
