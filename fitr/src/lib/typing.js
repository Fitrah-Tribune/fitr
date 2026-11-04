/**
 * The Student Challenge leaderboard's storage. The page itself is
 * src/pages/TypingTest.jsx; the test is Monkeytype (public/typing/).
 *
 * Scores live in the `typing` collection, one record per person holding
 * their best result. On Supabase the rules are enforced in
 * supabase/schema.sql (FIWA accounts only, best score kept, impossible
 * scores refused); the checks here are for the demo and for the buttons.
 */

export const TEST_SECONDS = 30
export const MAX_WPM = 250          // anything faster is refused
export const PAGE_SIZE = 50         // leaderboard rows shown at first, and per "Show more"
export const PREVIEW_SIZE = 5       // the More page's "Leading so far"

/* Which Monkeytype results count: 30 seconds of plain English (its default). */
export const counts = (testType) => String(testType || '').replace(/\s+/g, '') === `time${TEST_SECONDS}english`

/* ── Leaderboard ── */

const F = () => window.FITR

export function rankScores(list) {
  return list
    .filter(r => Number.isFinite(Number(r.wpm)))
    .sort((a, b) => (b.wpm - a.wpm) || (b.acc - a.acc) || ((a.updatedAt || 0) - (b.updatedAt || 0)))
}

export async function listScores() {
  if (!F().Auth.isFiwa()) return []
  return rankScores(await F().Store.list('typing'))
}

/* The signed-in person's own record, if any. On Supabase only your own
   record carries your email; in the demo every record does. */
export function findMine(list) {
  const me = (F().Auth.current().email || '').toLowerCase()
  return me ? list.find(r => (r.email || '').toLowerCase() === me) || null : null
}

/* Saves a result if it beats the person's best. Returns the record kept. */
export async function submitScore(result, current) {
  const { Auth, Store } = F()
  if (!Auth.isFiwa()) throw new Error('The Student Challenge is for FIWA accounts')
  if (!(result.wpm >= 0 && result.wpm <= MAX_WPM)) throw new Error('That score could not be saved')
  if (current && Number(current.wpm) >= result.wpm) return current
  const me = Auth.current()
  const item = {
    // Supabase picks the real id from the account; this one is for the demo.
    id: current?.id || 'typ-' + me.email.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    email: me.email.toLowerCase(),
    name: me.name,
    wpm: result.wpm,
    acc: result.acc,
    raw: result.raw,
    seconds: TEST_SECONDS
  }
  return await Store.save('typing', item)
}

export async function removeScore(id) {
  const { Auth, Store } = F()
  if (!(await Auth.isAdmin())) throw new Error('Only admins can remove scores')
  await Store.remove('typing', id)
}
