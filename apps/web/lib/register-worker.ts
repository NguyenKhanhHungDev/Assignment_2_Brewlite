export async function registerWorker() {
  if (process.env.NODE_ENV !== 'production' || !window.isSecureContext || !('serviceWorker' in navigator)) return;
  return navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
}
