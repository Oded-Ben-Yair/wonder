import { distanceKm, availabilityOverlapRatio } from '@wonder/shared-utils';

export function basicMatch(query, nurses) {
  const { city, service, nurseName, start, end, lat, lng, radiusKm = 25, topK = 3 } = query || {};
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const day = s ? ['sun','mon','tue','wed','thu','fri','sat'][s.getUTCDay()] : null;

  const filtered = (nurses||[])
    // Filter by nurse name first if provided
    .filter(n => {
      if (!nurseName) return true;
      const searchName = String(nurseName).toLowerCase();

      // Check displayName, name, firstName+lastName, and searchableNames
      if (n.displayName && n.displayName.toLowerCase().includes(searchName)) return true;
      if (n.name && n.name.toLowerCase().includes(searchName)) return true;
      if (n.firstName && n.firstName.toLowerCase().includes(searchName)) return true;
      if (n.lastName && n.lastName.toLowerCase().includes(searchName)) return true;

      // Check full name combination
      if (n.firstName && n.lastName) {
        const fullName = `${n.firstName} ${n.lastName}`.toLowerCase();
        if (fullName.includes(searchName)) return true;
      }

      // Check searchable name variations
      if (n.searchableNames && Array.isArray(n.searchableNames)) {
        return n.searchableNames.some(sn => sn.toLowerCase().includes(searchName));
      }

      return false;
    })
    // Then filter by city
    .filter(n => {
      if (!city) return true;
      const cityLower = String(city).toLowerCase();
      
      // Check the city field directly
      if (n.city && n.city.toLowerCase().includes(cityLower)) {
        return true;
      }
      
      // Also check municipality array for backwards compatibility
      if (n.municipality && n.municipality.length > 0) {
        return n.municipality.some(muni => 
          muni.toLowerCase().includes(cityLower) || 
          cityLower.includes(muni.toLowerCase())
        );
      }
      
      // Check _originalMunicipalities if available
      if (n._originalMunicipalities && n._originalMunicipalities.length > 0) {
        return n._originalMunicipalities.some(muni => 
          muni.toLowerCase().includes(cityLower) || 
          cityLower.includes(muni.toLowerCase())
        );
      }
      
      return false;
    })
    .filter(n => {
      if (!service) return true;
      const reqLower = String(service).toLowerCase();
      
      // Check services array (formatted friendly names like "General Nursing")
      const hasServiceMatch = (n.services || []).some(svc => {
        const svcLower = svc.toLowerCase();
        return svcLower.includes(reqLower) || 
               reqLower.includes(svcLower) ||
               // Special mappings for common service names
               (reqLower === 'general care' && svcLower === 'general nursing') ||
               (reqLower === 'wound care' && svcLower.includes('wound')) ||
               (reqLower === 'pediatrics' && svcLower === 'pediatrics') ||
               (reqLower === 'day night' && svcLower === 'day night') ||
               (reqLower === 'home care' && svcLower === 'home care') ||
               (reqLower === 'hospital' && svcLower === 'hospital') ||
               (reqLower === 'medication' && svcLower === 'medication') ||
               (reqLower === 'general' && svcLower === 'general');
      });
      
      // Also check specialization array (raw format like "DEFAULT", "WOUND_CARE")
      const hasSpecMatch = (n.specialization || []).some(spec => {
        const specLower = spec.toLowerCase();
        return specLower.includes(reqLower) || 
               reqLower.includes(specLower) || 
               (reqLower.includes('wound') && specLower.includes('wound')) ||
               (reqLower.includes('care') && (specLower.includes('care') || specLower.includes('treatment'))) ||
               (reqLower.includes('general') && specLower.includes('default')) ||
               (reqLower === 'pediatrics' && (specLower.includes('pediatric') || specLower.includes('newborn') || specLower.includes('breastfeed'))) ||
               (reqLower === 'day night' && specLower.includes('day_night')) ||
               (reqLower === 'home care' && (specLower.includes('home') || specLower.includes('escort') || specLower.includes('palliative')));
      });
      
      return hasServiceMatch || hasSpecMatch;
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
    name: n.displayName || n.name || `Nurse ${n.nurseId?.substring(0,8)}`,
    firstName: n.firstName || '',
    lastName: n.lastName || '',
    displayName: n.displayName || n.name || '',
    isHebrew: n.isHebrew || false,
    city: n.municipality?.[0] || n.city || 'Unknown',
    municipality: n.municipality,
    specialization: n.specialization,
    reason: `passed: ${[nurseName?'name':null, service?'service':null, city?'city':null, s?'availability':null, (lat!=null&&lng!=null)?'distance':null].filter(Boolean).join(', ')}`,
    meta: { distanceKm: n._dKm, availabilityRatio: n._avail, rating: n.rating, reviewsCount: n.reviewsCount }
  }));
}
