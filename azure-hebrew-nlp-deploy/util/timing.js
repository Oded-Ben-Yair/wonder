export function startTimer() {
  const start = process.hrtime.bigint();
  
  return {
    end() {
      const end = process.hrtime.bigint();
      const ms = Number(end - start) / 1_000_000;
      return Math.round(ms * 100) / 100; // Round to 2 decimal places
    }
  };
}

export function withTimeout(promise, timeoutMs = 3000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}