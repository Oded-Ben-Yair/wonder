import { distanceKm, availabilityOverlapRatio } from '@wonder/shared-utils';

export function basicMatch(query, nurses) {
  const { city, service, start, end, lat, lng, radiusKm = 25, topK = 3 } = query || {};
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const day = s ? ['sun','mon','tue','wed','thu','fri','sat'][s.getUTCDay()] : null;

  const filtered = (nurses||[])
    .filter(n => !city || n.city?.toLowerCase().includes(String(city).toLowerCase()) || String(city).toLowerCase().includes(n.city?.toLowerCase() || ''))
    .filter(n => !service || (n.services||[]).some(x => {
      const svc = x.toLowerCase();
      const req = String(service).toLowerCase();
      return svc.includes(req) || req.includes(svc) || 
             (req.includes('general') && svc.includes('general')) ||
             (req.includes('care') && svc.includes('nursing'));
    }))
    .map(n => {
      const dKm = (lat!=null && lng!=null && n.lat!=null && n.lng!=null) ? distanceKm(lat,lng,n.lat,n.lng) : null;
      const avail = (s && e) ? availabilityOverlapRatio(s,e,n.availability,day) : 1;
      return { ...n, _dKm: dKm, _avail: avail };
    })
    .filter(n => n._avail > 0)
    .filter(n => (n._dKm == null) || (n._dKm <= radiusKm));

  const sorted = filtered.sort((a,b) => {
    if ((b.rating??0)!==(a.rating??0)) return (b.rating??0)-(a.rating??0);
    if ((b.reviewsCount??0)!==(a.reviewsCount??0)) return (b.reviewsCount??0)-(a.reviewsCount??0);
    return (a._dKm??1e9)-(b._dKm??1e9);
  });

  return sorted.slice(0, topK).map(n => ({
    id: n.id, name: n.name, city: n.city,
    reason: `passed: ${[service?'service':null, city?'city':null, s?'availability':null, (lat!=null&&lng!=null)?'distance':null].filter(Boolean).join(', ')}`,
    meta: { distanceKm: n._dKm, availabilityRatio: n._avail, rating: n.rating, reviewsCount: n.reviewsCount }
  }));
}
