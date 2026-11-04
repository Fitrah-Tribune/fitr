// Cloudflare Pages Function: /api/weather-alerts
// BMKG's live weather warnings (nowcasts, 0 to 6 hours ahead) that cover
// FIWA, from BMKG's open early-warning data (data.bmkg.go.id/peringatan-dini-cuaca).
// BMKG publishes an RSS list of current warnings and one CAP (Common
// Alerting Protocol) file per warning. This reads the list, opens the
// warnings for West Java, and keeps the ones whose area covers Karihkil,
// Ciseeng: by the warning's map outline when FIWA's position is known,
// otherwise by the district name. Cloudflare keeps the answer for 10
// minutes, so readers share one set of requests (BMKG allows 60 a minute).
// BMKG must be credited wherever this is shown.

const FEED = lang => `https://www.bmkg.go.id/alerts/nowcast/${lang}/rss.xml`
const FORECAST = 'https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=32.01.33.2006'
const DISTRICT = /ciseeng/i
const PROVINCE = /jawa barat|west java/i
const KEEP = 600

// CAP tags may come with or without a namespace prefix (cap:info, info).
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'i'))
  return m ? clean(m[1]) : ''
}
const tags = (xml, name) =>
  [...xml.matchAll(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'gi'))].map(m => m[1])
const clean = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .trim()

// CAP polygons are "lat,lon lat,lon …". Ray casting: is the point inside?
function inside(polygon, lat, lon) {
  const pts = polygon.trim().split(/\s+/).map(p => p.split(',').map(Number)).filter(p => p.length === 2 && p.every(Number.isFinite))
  let hit = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [yi, xi] = pts[i], [yj, xj] = pts[j]
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

async function get(url, ttl) {
  const res = await fetch(url, { cf: { cacheTtl: ttl, cacheEverything: true } })
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return res.text()
}

async function fiwaPosition() {
  try {
    const json = JSON.parse(await get(FORECAST, 1800))
    const loc = json.lokasi || (json.data && json.data[0] && json.data[0].lokasi) || {}
    const lat = Number(loc.lat), lon = Number(loc.lon)
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null
  } catch { return null }
}

async function alertsFor(lang, where) {
  const rss = await get(FEED(lang), KEEP)
  const items = tags(rss, 'item').map(it => ({ title: tag(it, 'title'), link: tag(it, 'link'), text: tag(it, 'description') }))
  const west = items.filter(it => PROVINCE.test(it.title + ' ' + it.text) && /^https:\/\/[^/]*bmkg\.go\.id\//.test(it.link))
  const now = Date.now()
  const found = []
  for (const it of west.slice(0, 10)) {
    let xml
    try { xml = await get(it.link, KEEP) } catch { continue }
    for (const info of tags(xml, 'info')) {
      const expires = Date.parse(tag(info, 'expires'))
      if (Number.isFinite(expires) && expires < now) continue
      const areas = tags(info, 'area')
      const covers = areas.some(a =>
        DISTRICT.test(tag(a, 'areaDesc')) ||
        (where && tags(a, 'polygon').some(p => inside(clean(p), where.lat, where.lon))))
      if (!covers) continue
      found.push({
        id: tag(xml, 'identifier'),
        event: tag(info, 'event'),
        severity: tag(info, 'severity'),      // Minor, Moderate, Severe or Extreme
        urgency: tag(info, 'urgency'),
        headline: tag(info, 'headline'),
        description: tag(info, 'description'),
        effective: tag(info, 'effective') || tag(info, 'onset'),
        expires: tag(info, 'expires'),
        web: tag(info, 'web') || it.link
      })
      break
    }
  }
  return found
}

export async function onRequestGet() {
  try {
    const where = await fiwaPosition()
    let alerts
    try { alerts = await alertsFor('en', where) } catch { alerts = await alertsFor('id', where) }
    const order = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3 }
    alerts.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4))
    return new Response(JSON.stringify({ alerts, checked: new Date().toISOString() }), {
      headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${KEEP}` }
    })
  } catch {
    return new Response(JSON.stringify({ alerts: [], error: 'BMKG warnings unavailable' }), {
      status: 502, headers: { 'content-type': 'application/json' }
    })
  }
}
