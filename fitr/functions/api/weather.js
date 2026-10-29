// Cloudflare Pages Function: /api/weather
// Fetches BMKG's public forecast for Karihkil, Ciseeng (32.01.33.2006) and
// lets Cloudflare keep it for 30 minutes, so readers share one request and
// the browser never has to call BMKG across sites.
const BMKG = 'https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=32.01.33.2006';

export async function onRequestGet() {
  const res = await fetch(BMKG, { cf: { cacheTtl: 1800, cacheEverything: true } });
  if (!res.ok) return new Response('BMKG unavailable', { status: 502 });
  return new Response(await res.text(), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=1800' }
  });
}
