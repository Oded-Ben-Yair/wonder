// Cache for parsed time windows
const timeWindowCache = new Map();

/**
 * Optimized availability overlap calculation
 * @param {Date} startISO - Start time as Date object
 * @param {Date} endISO - End time as Date object
 * @param {Object} availability - Availability schedule object
 * @param {string} dayKey - Day of week key (e.g., 'mon', 'tue')
 * @returns {number} Overlap ratio between 0 and 1
 */
export function availabilityOverlapRatio(startISO, endISO, availability, dayKey) {
  if (!startISO || !endISO || !availability) return 0;

  // Convert to timestamps for faster arithmetic
  const startTime = startISO.getTime ? startISO.getTime() : startISO;
  const endTime = endISO.getTime ? endISO.getTime() : endISO;

  const totalMinutes = Math.max(0, (endTime - startTime) / 60000);
  if (totalMinutes <= 0) return 0;

  const key = dayKey || ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][
    new Date(startTime).getUTCDay()
  ];

  const windows = availability?.[key] || [];
  if (windows.length === 0) return 0;

  let overlapMinutes = 0;

  // Pre-calculate base date components once
  const baseDate = new Date(startTime);
  const baseYear = baseDate.getUTCFullYear();
  const baseMonth = baseDate.getUTCMonth();
  const baseDay = baseDate.getUTCDate();

  for (const w of windows) {
    // Cache parsed time window
    const cacheKey = `${w.start}_${w.end}`;
    let parsedWindow = timeWindowCache.get(cacheKey);

    if (!parsedWindow) {
      const [startHour, startMin] = (w.start || '00:00').split(':').map(Number);
      const [endHour, endMin] = (w.end || '00:00').split(':').map(Number);
      parsedWindow = { startHour, startMin: startMin || 0, endHour, endMin: endMin || 0 };

      // Limit cache size
      if (timeWindowCache.size > 100) {
        const firstKey = timeWindowCache.keys().next().value;
        timeWindowCache.delete(firstKey);
      }
      timeWindowCache.set(cacheKey, parsedWindow);
    }

    // Calculate window timestamps using UTC methods directly
    const windowStart = Date.UTC(
      baseYear,
      baseMonth,
      baseDay,
      parsedWindow.startHour,
      parsedWindow.startMin,
      0,
      0
    );

    const windowEnd = Date.UTC(
      baseYear,
      baseMonth,
      baseDay,
      parsedWindow.endHour,
      parsedWindow.endMin,
      0,
      0
    );

    // Calculate overlap
    const overlapStart = Math.max(startTime, windowStart);
    const overlapEnd = Math.min(endTime, windowEnd);

    if (overlapEnd > overlapStart) {
      overlapMinutes += (overlapEnd - overlapStart) / 60000;
    }
  }

  return Math.max(0, Math.min(1, overlapMinutes / totalMinutes));
}

/**
 * Batch availability calculation for multiple nurses
 * @param {Date} startISO - Start time
 * @param {Date} endISO - End time
 * @param {Array<Object>} nursesAvailability - Array of availability objects
 * @param {string} dayKey - Day of week
 * @returns {Array<number>} Array of overlap ratios
 */
export function batchAvailabilityRatio(startISO, endISO, nursesAvailability, dayKey) {
  if (!startISO || !endISO) {
    return nursesAvailability.map(() => 0);
  }

  const startTime = startISO.getTime ? startISO.getTime() : startISO;
  const endTime = endISO.getTime ? endISO.getTime() : endISO;
  const totalMinutes = Math.max(0, (endTime - startTime) / 60000);

  if (totalMinutes <= 0) {
    return nursesAvailability.map(() => 0);
  }

  const key = dayKey || ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][
    new Date(startTime).getUTCDay()
  ];

  // Pre-calculate shared values
  const baseDate = new Date(startTime);
  const baseYear = baseDate.getUTCFullYear();
  const baseMonth = baseDate.getUTCMonth();
  const baseDay = baseDate.getUTCDate();

  return nursesAvailability.map(availability => {
    if (!availability) return 0;

    const windows = availability[key] || [];
    if (windows.length === 0) return 0;

    let overlapMinutes = 0;

    for (const w of windows) {
      const cacheKey = `${w.start}_${w.end}`;
      let parsedWindow = timeWindowCache.get(cacheKey);

      if (!parsedWindow) {
        const [startHour, startMin] = (w.start || '00:00').split(':').map(Number);
        const [endHour, endMin] = (w.end || '00:00').split(':').map(Number);
        parsedWindow = { startHour, startMin: startMin || 0, endHour, endMin: endMin || 0 };

        if (timeWindowCache.size > 100) {
          const firstKey = timeWindowCache.keys().next().value;
          timeWindowCache.delete(firstKey);
        }
        timeWindowCache.set(cacheKey, parsedWindow);
      }

      const windowStart = Date.UTC(
        baseYear,
        baseMonth,
        baseDay,
        parsedWindow.startHour,
        parsedWindow.startMin,
        0,
        0
      );

      const windowEnd = Date.UTC(
        baseYear,
        baseMonth,
        baseDay,
        parsedWindow.endHour,
        parsedWindow.endMin,
        0,
        0
      );

      const overlapStart = Math.max(startTime, windowStart);
      const overlapEnd = Math.min(endTime, windowEnd);

      if (overlapEnd > overlapStart) {
        overlapMinutes += (overlapEnd - overlapStart) / 60000;
      }
    }

    return Math.max(0, Math.min(1, overlapMinutes / totalMinutes));
  });
}