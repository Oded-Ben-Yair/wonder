export function maskSensitive(value) {
  if (!value) return '';
  const str = String(value);
  
  // Mask API keys and tokens
  if (str.match(/^sk-/) || str.match(/^Bearer /)) {
    return str.substring(0, 10) + '***';
  }
  
  // Truncate long values
  if (str.length > 500) {
    return str.substring(0, 500) + '...[truncated]';
  }
  
  return str;
}

export function maskObject(obj, keysToMask = ['key', 'token', 'password', 'secret']) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const masked = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (keysToMask.some(k => lowerKey.includes(k))) {
      masked[key] = '***';
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      masked[key] = maskObject(value, keysToMask);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}