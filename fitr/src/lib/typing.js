/**
 * The Student Challenge typing test: words, scoring, settings, and the
 * leaderboard's storage. The page itself is src/pages/TypingTest.jsx.
 *
 * Scores live in the `typing` collection, one record per person holding
 * their best result. On Supabase the rules are enforced in
 * supabase/schema.sql (FIWA accounts only, best score kept, impossible
 * scores refused); the checks here are for the demo and for the buttons.
 */

export const TEST_SECONDS = 30
export const MAX_WPM = 250          // anything faster is refused
export const PAGE_SIZE = 100        // leaderboard rows shown per "Show more"

/* Common English words, so every test is equally hard. */
const WORDS = `the be of and a to in he have it that for they with as not on she at by this we you do
but from or which one would all will there say who make when can more if no man out other so what time
up go about than into could state only new year some take come these know see use get like then first
any work now may such give over think most even find day also after way many must look before great
back through long where much should well people down own just because good each those feel seem how
high too place little world very still nation hand old life tell write become here show house both
between need mean call develop under last right move thing general school never same another begin
while number part turn real leave might want point form off child few small since against ask late
home interest large person end open public follow during present without again hold govern around
possible head consider word program problem however lead system set order eye plan run keep face fact
group play stand increase early course change help line city put close case force meet once water upon
war build hear light unite live every country bring center let side try provide continue name certain
power pay result question study woman member until far night always service away report something
company week church toward start social room figure nature though young less enough almost read include
president nothing yet better big boy cost business value second why clear expect family complete act
sense mind experience art next near direct car law industry important girl god several matter usual
rather per often kind among white reason action return foot care simple within love human along appear
doctor believe speak active student month drive concern best door hope example inform body ever least
probable understand reach effect different idea whole control condition field pass fall note special
talk particular today measure walk teach low hour type carry rate remain full street easy although
record sit paper`.split(/\s+/).filter(Boolean)

export function makeWords(n = 120, prev = '') {
  const out = []
  let last = prev
  while (out.length < n) {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)]
    if (w === last) continue
    out.push(w)
    last = w
  }
  return out
}

/* Scores from the words typed so far.
   words: the target words; typed: what was typed for each word (up to and
   including the current one); done: how many words were finished with a
   space; keys: { good, all } keystrokes. */
export function score({ words, typed, done, keys, seconds }) {
  let correctChars = 0, allChars = 0, wrongChars = 0
  typed.forEach((t, i) => {
    const w = words[i] || ''
    const finished = i < done
    if (t === w) correctChars += w.length + (finished ? 1 : 0)
    allChars += t.length + (finished ? 1 : 0)
    for (let k = 0; k < t.length; k++) if (t[k] !== w[k]) wrongChars++
  })
  const minutes = Math.max(seconds, 1) / 60
  return {
    wpm: Math.round((correctChars / 5) / minutes),
    raw: Math.round((allChars / 5) / minutes),
    acc: keys.all ? Math.round((keys.good / keys.all) * 1000) / 10 : 100,
    correctChars,
    wrongChars
  }
}

/* ── Settings (per device; they change how the test looks, never the score) ── */

export const SETTINGS = [
  { key: 'caretStyle', label: 'Caret', help: 'The marker that shows where you are.',
    options: [['line', 'Line'], ['block', 'Block'], ['underline', 'Underline'], ['off', 'Off']] },
  { key: 'caretSpeed', label: 'Smooth caret', help: 'How smoothly the caret glides to the next letter.',
    options: [['off', 'Off'], ['fast', 'Fast'], ['medium', 'Medium'], ['slow', 'Slow']] },
  { key: 'tape', label: 'Tape mode', help: 'Words run along one line, like ticker tape, instead of wrapping.',
    options: [['off', 'Off'], ['letter', 'Letter'], ['word', 'Word']] },
  { key: 'keyboard', label: 'On-screen keyboard', help: 'Shows a keyboard under the words.',
    options: [['off', 'Off'], ['react', 'Light up keys I press'], ['next', 'Show the next key']] },
  { key: 'timer', label: 'Time left', help: 'How the countdown is shown.',
    options: [['text', 'Number'], ['bar', 'Bar'], ['off', 'Hidden']] },
  { key: 'liveWpm', label: 'Live speed', help: 'Shows your WPM while you type.',
    options: [['off', 'Off'], ['on', 'On']] },
  { key: 'liveAcc', label: 'Live accuracy', help: 'Shows your accuracy while you type.',
    options: [['off', 'Off'], ['on', 'On']] },
  { key: 'stopOnError', label: 'Stop on error', help: 'A wrong letter is not typed until you press the right one.',
    options: [['off', 'Off'], ['on', 'On']] },
  { key: 'confidence', label: 'Confidence mode', help: 'Backspace is turned off.',
    options: [['off', 'Off'], ['on', 'On']] },
  { key: 'blind', label: 'Blind mode', help: 'Mistakes are not shown while you type.',
    options: [['off', 'Off'], ['on', 'On']] },
  { key: 'restartKey', label: 'Quick restart', help: 'The key that starts a new test.',
    options: [['tab', 'Tab'], ['esc', 'Esc'], ['off', 'Off']] }
]

export const DEFAULT_SETTINGS = {
  caretStyle: 'line', caretSpeed: 'fast', tape: 'off', keyboard: 'off', timer: 'text',
  liveWpm: 'off', liveAcc: 'off', stopOnError: 'off', confidence: 'off', blind: 'off', restartKey: 'tab'
}

const SETTINGS_KEY = 'fitrah:typing-settings'
export function loadSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') } }
  catch { return { ...DEFAULT_SETTINGS } }
}
export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) } catch { /* private window */ }
}

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
