import { distanceKm, availabilityOverlapRatio } from '@wonder/shared-utils';

export function basicMatch(query, nurses) {
  const { city, service, start, end, lat, lng, radiusKm = 25, topK = 3 } = query || {};
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const day = s ? ['sun','mon','tue','wed','thu','fri','sat'][s.getUTCDay()] : null;

  const filtered = (nurses||[])
    .filter(n => {
      if (!city) return true;
      const cityLower = String(city).toLowerCase();
      // Check if any municipality matches
      return (n.municipality || []).some(muni => 
        muni.toLowerCase().includes(cityLower) || 
        cityLower.includes(muni.toLowerCase())
      );
    })
    .filter(n => {
      if (!service) return true;
      const reqLower = String(service).toLowerCase();
      // Check if any specialization matches
      return (n.specialization || []).some(spec => {
        const specLower = spec.toLowerCase();
        return specLower.includes(reqLower) || 
               reqLower.includes(specLower) || 
               (reqLower.includes('wound') && specLower.includes('wound')) ||
               (reqLower.includes('care') && (specLower.includes('care') || specLower.includes('treatment'))) ||
               (reqLower.includes('general') && specLower.includes('default'));
      });
    })
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
    id: n.nurseId || n.id, 
    name: n.name || `Nurse ${n.nurseId?.substring(0,8)}`, 
    city: n.municipality?.[0] || n.city || 'Unknown',
    municipality: n.municipality,
    specialization: n.specialization,
    reason: `passed: ${[service?'service':null, city?'city':null, s?'availability':null, (lat!=null&&lng!=null)?'distance':null].filter(Boolean).join(', ')}`,
    meta: { distanceKm: n._dKm, availabilityRatio: n._avail, rating: n.rating, reviewsCount: n.reviewsCount }
  }));
}
