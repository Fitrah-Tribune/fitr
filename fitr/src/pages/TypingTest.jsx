import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useReactPage from '../lib/useReactPage'
import {
  TEST_SECONDS, PAGE_SIZE, SETTINGS, DEFAULT_SETTINGS, makeWords, score,
  loadSettings, saveSettings, listScores, findMine, submitScore, removeScore
} from '../lib/typing'

// Route: /more/typing
// The Student Challenge: a 30-second typing test and the FIWA leaderboard.
// Only FIWA accounts can take it or see the board (also enforced in
// supabase/schema.sql).
export default function TypingTest() {
  const { ready, version } = useReactPage('more', 'The Tribune Typing Test')
  const F = window.FITR
  const fiwa = ready && F.Auth.isFiwa()

  const [settings, setSettings] = useState(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [board, setBoard] = useState({ loading: true, list: [] })
  const [admin, setAdmin] = useState(false)
  const [save, setSave] = useState(null)       // what happened to the last result

  const loadBoard = useCallback(async () => {
    try {
      const list = await listScores()
      setBoard({ loading: false, list })
      return list
    } catch (e) {
      setBoard({ loading: false, list: [], error: e.message })
      return []
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    let live = true
    listScores()
      .then(list => { if (live) setBoard({ loading: false, list }) })
      .catch(e => { if (live) setBoard({ loading: false, list: [], error: e.message }) })
    window.FITR.Auth.isAdmin().then(a => { if (live) setAdmin(a) })
    return () => { live = false }
  }, [ready, version])

  const changeSetting = (key, value) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    saveSettings(next)
  }

  const onStart = useCallback(() => setSave(null), [])
  const onFinish = useCallback(async (result) => {
    setSave({ state: 'saving' })
    try {
      const before = findMine(await listScores())
      const kept = await submitScore(result, before)
      const list = await loadBoard()
      const rank = list.findIndex(r => r.id === kept.id) + 1
      const best = !before || result.wpm > Number(before.wpm)
      setSave({ state: 'done', best, kept, rank })
    } catch (e) {
      setSave({ state: 'error', message: e.message })
    }
  }, [loadBoard])

  return (
    <section className="page active" id="page-more">
      <Link to="/more" className="typing-back">← More</Link>
      <div className="section-head">
        <h2>The Tribune Typing Test</h2>
        <span className="sub">— Student Challenge</span>
        {fiwa && (
          <div className="head-action">
            <button className={'btn-ghost' + (showSettings ? ' on' : '')} onClick={() => setShowSettings(s => !s)}>
              Settings
            </button>
          </div>
        )}
      </div>

      {!ready ? null : !fiwa ? <Locked /> : (
        <>
          {showSettings && <SettingsPanel settings={settings} onChange={changeSetting} />}
          <Test settings={settings} onFinish={onFinish} onStart={onStart} save={save} />
          <Leaderboard board={board} admin={admin} onRemove={async (r) => {
            if (!window.confirm(`Remove ${r.name || 'this'}'s score from the leaderboard?`)) return
            try { await removeScore(r.id); await loadBoard() }
            catch (e) { window.FITR.toast(e.message, 'error') }
          }} />
        </>
      )}
    </section>
  )
}

/* ── For guests and non-FIWA accounts ── */
function Locked() {
  const F = window.FITR
  const guest = F.Auth.isGuest()
  return (
    <div className="empty-state typing-locked">
      <h3>For FIWA accounts</h3>
      {guest ? (
        <p>The Student Challenge is open to the FIWA community. Sign in with your @fiwa.sch.id account to take the test and see the leaderboard.</p>
      ) : (
        <p>You’re signed in as {F.Auth.current().email}, which isn’t a FIWA account. Sign in with your @fiwa.sch.id account to take the test.</p>
      )}
      {guest
        ? <button className="btn-navy" onClick={() => F.SignIn.open()}>Sign in</button>
        : <button className="btn-ghost" onClick={() => F.SignIn.signOut()}>Sign out</button>}
    </div>
  )
}

/* ── Settings ── */
function SettingsPanel({ settings, onChange }) {
  return (
    <div className="typing-settings">
      {SETTINGS.map(s => (
        <div className="ts-row" key={s.key}>
          <div className="ts-label">
            <span className="ts-name">{s.label}</span>
            <span className="ts-help">{s.help}</span>
          </div>
          <div className="ts-options" role="radiogroup" aria-label={s.label}>
            {s.options.map(([value, label]) => (
              <button key={value} role="radio" aria-checked={settings[s.key] === value}
                className={settings[s.key] === value ? 'on' : ''}
                onClick={() => onChange(s.key, value)}>{label}</button>
            ))}
          </div>
        </div>
      ))}
      <div className="ts-foot">
        <span>Settings are kept on this device. They change how the test looks, not how it’s scored.</span>
        <button className="ts-reset" onClick={() => Object.entries(DEFAULT_SETTINGS).forEach(([k, v]) => onChange(k, v))}>
          Reset to default
        </button>
      </div>
    </div>
  )
}

/* ── The test ── */
const fresh = () => ({
  words: makeWords(), typed: [''], idx: 0, keys: { good: 0, all: 0 },
  startedAt: null, finished: false, result: null
})
const CARET_MS = { off: 0, fast: 70, medium: 140, slow: 240 }
const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

function Test({ settings, onFinish, onStart, save }) {
  const [t, setT] = useState(fresh)
  const [now, setNow] = useState(0)
  const [focused, setFocused] = useState(true)
  const [pressed, setPressed] = useState(null)
  const inputRef = useRef(null)
  const boxRef = useRef(null)
  const innerRef = useRef(null)
  const caretRef = useRef(null)
  const reported = useRef(null)

  const restart = useCallback(() => {
    setT(fresh())
    setNow(0)
    onStart?.()
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [onStart])

  // The clock. Starts on the first letter; the test ends at TEST_SECONDS.
  useEffect(() => {
    if (!t.startedAt || t.finished) return
    const tick = setInterval(() => {
      const elapsed = (performance.now() - t.startedAt) / 1000
      setNow(elapsed)
      if (elapsed >= TEST_SECONDS) {
        setT(p => p.finished ? p : {
          ...p, finished: true,
          result: score({ words: p.words, typed: p.typed, done: p.idx, keys: p.keys, seconds: TEST_SECONDS })
        })
      }
    }, 100)
    return () => clearInterval(tick)
  }, [t.startedAt, t.finished])

  // Report each finished test once.
  useEffect(() => {
    if (t.result && reported.current !== t) {
      reported.current = t
      onFinish(t.result)
    }
  }, [t, onFinish])

  // A changed setting starts a new test.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    restart()
  }, [settings.stopOnError, settings.confidence, restart])

  /* Typing goes through a hidden input that always holds one space, so
     Backspace works on phones too. Each change is applied to the latest
     state (typing fast can land several letters between two renders). */
  const SENTINEL = ' '
  const onInput = (e) => {
    const el = e.target
    const ev = e.nativeEvent
    const type = ev.inputType || ''
    let data = ev.data
    if (data == null && type.startsWith('insert')) data = el.value.slice(SENTINEL.length)
    el.value = SENTINEL
    if (type === 'insertFromPaste' || type === 'insertFromDrop') return
    const stop = settings.stopOnError === 'on'
    const confident = settings.confidence === 'on'

    setT(p => {
      if (p.finished) return p
      let { words, typed, idx, keys, startedAt } = p
      typed = [...typed]
      keys = { ...keys }
      if (type.startsWith('delete')) {
        if (confident) return p
        typed[idx] = type === 'deleteWordBackward' ? '' : typed[idx].slice(0, -1)
        return { ...p, typed }
      }
      for (const c of data || '') {
        const cur = typed[idx], word = words[idx]
        if (c === ' ') {
          if (!cur) continue
          keys.all++
          if (cur === word) keys.good++
          typed.push('')
          idx++
          if (idx > words.length - 40) words = [...words, ...makeWords(60, words.at(-1))]
          continue
        }
        if (cur.length >= word.length + 10) continue
        startedAt = startedAt ?? performance.now()
        const good = c === word[cur.length]
        keys.all++
        if (good) keys.good++
        if (!good && stop) continue
        typed[idx] = cur + c
      }
      return { ...p, words, typed, idx, keys, startedAt }
    })
  }

  const onKeyDown = (e) => {
    const restartKey = settings.restartKey
    if ((restartKey === 'tab' && e.key === 'Tab') || (restartKey === 'esc' && e.key === 'Escape')) {
      e.preventDefault()
      restart()
      return
    }
    if (t.finished && e.key === 'Enter') { e.preventDefault(); restart(); return }
    const k = e.key === ' ' ? ' ' : (e.key || '').toLowerCase()
    setPressed(k)
    setTimeout(() => setPressed(p => (p === k ? null : p)), 140)
  }

  // Caret position, line scrolling and tape mode.
  useLayoutEffect(() => {
    const box = boxRef.current, inner = innerRef.current, caret = caretRef.current
    if (!box || !inner || !caret) return
    const wordEl = inner.querySelector(`[data-w="${t.idx}"]`)
    if (!wordEl) return
    const letters = wordEl.querySelectorAll('.tl')
    const n = t.typed[t.idx].length
    let x, w
    if (n < letters.length) { x = wordEl.offsetLeft + letters[n].offsetLeft; w = letters[n].offsetWidth }
    else {
      const l = letters[letters.length - 1]
      x = wordEl.offsetLeft + l.offsetLeft + l.offsetWidth
      w = letters[0].offsetWidth
    }
    const y = wordEl.offsetTop, h = wordEl.offsetHeight
    let dx = 0, dy = 0
    if (settings.tape === 'off') {
      dy = Math.max(0, y - h * 1.25)
      dy = Math.round(dy / (h * 1.25)) * (h * 1.25)
    } else {
      const anchor = settings.tape === 'word' ? wordEl.offsetLeft : x
      dx = Math.max(0, anchor - box.clientWidth * 0.35)
    }
    inner.style.transform = `translate(${-dx}px, ${-dy}px)`
    const ms = CARET_MS[settings.caretSpeed] ?? 70
    caret.style.transition = ms ? `left ${ms}ms ease-out, top ${ms}ms ease-out, width ${ms}ms` : 'none'
    caret.style.left = x + 'px'
    caret.style.top = y + 'px'
    caret.style.height = h + 'px'
    caret.style.width = settings.caretStyle === 'line' ? '2px' : w + 'px'
  }, [t.idx, t.typed, t.words, settings.tape, settings.caretSpeed, settings.caretStyle, t.finished])

  const elapsed = t.startedAt ? Math.min(now, TEST_SECONDS) : 0
  const left = Math.ceil(TEST_SECONDS - elapsed)
  const live = score({ words: t.words, typed: t.typed, done: t.idx, keys: t.keys, seconds: Math.max(elapsed, 1) })
  const blind = settings.blind === 'on'
  const cur = t.typed[t.idx]
  const nextKey = (t.words[t.idx] || '')[cur.length] ?? ' '

  if (t.finished) {
    return <Result result={t.result} save={save} onRestart={restart} restartKey={settings.restartKey} />
  }

  return (
    <div className="typing-test">
      <div className="typing-stats">
        {settings.timer === 'text' && <span className="ts-time">{left}</span>}
        {settings.liveWpm === 'on' && <span className="ts-live">{t.startedAt ? live.wpm : 0} <small>wpm</small></span>}
        {settings.liveAcc === 'on' && <span className="ts-live">{live.acc}% <small>acc</small></span>}
        {!t.startedAt && <span className="ts-hint">Start typing to begin. The clock starts on your first letter.</span>}
      </div>
      {settings.timer === 'bar' && (
        <div className="typing-bar"><span style={{ width: `${(elapsed / TEST_SECONDS) * 100}%` }} /></div>
      )}

      <div ref={boxRef} className={`typing-words ${settings.tape !== 'off' ? 'tape' : ''}`}
        onClick={() => inputRef.current?.focus()}>
        <div ref={innerRef} className="typing-inner">
          {t.words.map((w, i) => {
            const typed = t.typed[i] ?? ''
            const past = i < t.idx
            const wrong = past && typed !== w && !blind
            return (
              <span key={i} data-w={i} className={'tw' + (wrong ? ' bad' : '')}>
                {[...w].map((ch, k) => {
                  let cls = 'tl'
                  if (k < typed.length) cls += blind || typed[k] === ch ? ' c' : ' x'
                  return <span key={k} className={cls}>{ch}</span>
                })}
                {[...typed.slice(w.length)].map((ch, k) => (
                  <span key={'e' + k} className={'tl extra' + (blind ? ' c' : ' x')}>{ch}</span>
                ))}
              </span>
            )
          })}
          <span ref={caretRef} className={`typing-caret ${settings.caretStyle} ${t.startedAt ? '' : 'idle'}`} aria-hidden="true" />
        </div>
        {!focused && <div className="typing-blur">Click here to keep typing</div>}
      </div>

      <input ref={inputRef} className="typing-input" defaultValue={SENTINEL} onInput={onInput} onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPaste={e => e.preventDefault()}
        autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        aria-label="Type the words shown" />

      {settings.keyboard !== 'off' && (
        <div className="typing-keyboard" aria-hidden="true">
          {KEY_ROWS.map(row => (
            <div className="kb-row" key={row}>
              {[...row].map(k => (
                <span key={k} className={'kb-key' + (settings.keyboard === 'react' && pressed === k ? ' on' : '')
                  + (settings.keyboard === 'next' && nextKey === k ? ' next' : '')}>{k}</span>
              ))}
            </div>
          ))}
          <div className="kb-row">
            <span className={'kb-key space' + (settings.keyboard === 'react' && pressed === ' ' ? ' on' : '')
              + (settings.keyboard === 'next' && nextKey === ' ' ? ' next' : '')}>space</span>
          </div>
        </div>
      )}

      <div className="typing-foot">
        <button className="btn-ghost" onClick={restart}>New test</button>
        {settings.restartKey !== 'off' && <span>or press {settings.restartKey === 'tab' ? 'Tab' : 'Esc'}</span>}
      </div>
    </div>
  )
}

function Result({ result, save, onRestart, restartKey }) {
  // Enter (or the quick-restart key) starts again, after a short pause so
  // a key still being typed when time runs out doesn't skip the result.
  useEffect(() => {
    const since = performance.now()
    const onKey = (e) => {
      if (performance.now() - since < 600) return
      if (e.key === 'Enter' || (restartKey === 'tab' && e.key === 'Tab') || (restartKey === 'esc' && e.key === 'Escape')) {
        e.preventDefault(); onRestart()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onRestart, restartKey])
  return (
    <div className="typing-result">
      <div className="tr-main">
        <div className="tr-big"><span className="tr-num">{result.wpm}</span><span className="tr-unit">wpm</span></div>
        <dl className="tr-stats">
          <div><dt>Accuracy</dt><dd>{result.acc}%</dd></div>
          <div><dt>Raw</dt><dd>{result.raw} wpm</dd></div>
          <div><dt>Letters</dt><dd>{result.correctChars} right · {result.wrongChars} wrong</dd></div>
          <div><dt>Time</dt><dd>{TEST_SECONDS} seconds</dd></div>
        </dl>
      </div>
      <p className="tr-save">
        {!save || save.state === 'saving' ? 'Saving to the leaderboard…'
          : save.state === 'error' ? `Couldn’t save this score: ${save.message}`
            : save.best ? `A new personal best! You’re #${save.rank} on the leaderboard.`
              : `Your best is still ${save.kept.wpm} wpm (#${save.rank} on the leaderboard).`}
      </p>
      <div className="typing-foot">
        <button className="btn-navy" onClick={onRestart}>Try again</button>
        <span>or press Enter</span>
      </div>
    </div>
  )
}

/* ── Leaderboard ── */
function Leaderboard({ board, admin, onRemove }) {
  const [shown, setShown] = useState(PAGE_SIZE)
  const list = board.list
  const mine = findMine(list)
  const myRank = mine ? list.indexOf(mine) + 1 : 0
  const rows = list.slice(0, shown)
  const date = (ms) => ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''

  const row = (r, rank) => (
    <tr key={r.id} className={r === mine ? 'me' : ''}>
      <td className="lb-rank">{rank}</td>
      <td className="lb-name">{r.name || 'FIWA student'}{r === mine && <span className="lb-you">You</span>}</td>
      <td className="lb-wpm">{r.wpm}</td>
      <td className="lb-acc">{r.acc}%</td>
      <td className="lb-date">{date(r.updatedAt)}</td>
      {admin && <td className="lb-act"><button onClick={() => onRemove(r)} title="Remove this score">Remove</button></td>}
    </tr>
  )

  return (
    <div className="typing-board">
      <div className="strip-head">
        <h3>Leaderboard</h3>
        <span className="lb-count">{list.length ? `${list.length} ${list.length === 1 ? 'person' : 'people'}` : ''}</span>
      </div>
      {board.loading ? <p className="lb-empty">Loading…</p>
        : board.error ? <p className="lb-empty">The leaderboard couldn’t load: {board.error}</p>
          : !list.length ? <p className="lb-empty">No scores yet. Be the first on the board.</p>
            : (
              <table className="lb-table">
                <thead>
                  <tr><th>#</th><th>Name</th><th>WPM</th><th>Accuracy</th><th className="lb-date">Date</th>{admin && <th />}</tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => row(r, i + 1))}
                  {mine && myRank > shown && (
                    <>
                      <tr className="lb-gap"><td colSpan={admin ? 6 : 5}>⋯</td></tr>
                      {row(mine, myRank)}
                    </>
                  )}
                </tbody>
              </table>
            )}
      {list.length > shown && (
        <button className="btn-ghost lb-more" onClick={() => setShown(s => s + PAGE_SIZE)}>
          Show more ({list.length - shown} more)
        </button>
      )}
      <p className="lb-note">Each person’s best {TEST_SECONDS}-second result counts.</p>
    </div>
  )
}
