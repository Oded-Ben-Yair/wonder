const R=6371; const toRad=d=>d*Math.PI/180;
export function distanceKm(lat1,lon1,lat2,lon2){
  if([lat1,lon1,lat2,lon2].some(v=>v==null)) return null;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}