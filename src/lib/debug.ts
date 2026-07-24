export const debugLog = (area: string, ...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(`[${area}]`, ...args);
};
