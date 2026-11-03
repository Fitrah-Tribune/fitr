import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import useReactPage from '../lib/useReactPage'
import { TEST_SECONDS, PAGE_SIZE, counts, listScores, findMine, submitScore, removeScore } from '../lib/typing'

// Route: /more/typing (the test) and /more/typing?view=leaderboard
// The Student Challenge: Monkeytype in a frame, and the FIWA leaderboard,
// which opens from Monkeytype's own leaderboard (crown) button. Only FIWA
// accounts can take it or see the board (also enforced in
// supabase/schema.sql).
export default function TypingTest() {
  const { ready, version } = useReactPage('more', 'The Tribune Typing Test')
  const F = window.FITR
  const fiwa = ready && F.Auth.isFiwa()

  const [board, setBoard] = useState({ loading: true, list: [] })
  const [admin, setAdmin] = useState(false)
  const [save, setSave] = useState(null)       // what happened to the last result
  const [params, setParams] = useSearchParams()
  const showBoard = params.get('view') === 'leaderboard'
  const openBoard = useCallback(() => setParams({ view: 'leaderboard' }), [setParams])
  const closeBoard = () => setParams({})

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

  const onResult = useCallback(async (result) => {
    if (!counts(result.testType)) { setSave({ state: 'skipped', testType: result.testType }); return }
    setSave({ state: 'saving' })
    try {
      const before = findMine(await listScores())
      const kept = await submitScore(result, before)
      const list = await loadBoard()
      const rank = list.findIndex(r => r.id === kept.id) + 1
      const best = !before || result.wpm > Number(before.wpm)
      setSave({ state: 'done', best, kept, rank, wpm: result.wpm })
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
      </div>

      {!ready ? null : !fiwa ? <Locked /> : (
        <>
          {/* The frame stays loaded while the board is open, so a test isn't lost. */}
          <div hidden={showBoard}>
            <MonkeyFrame onResult={onResult} onOpenBoard={openBoard} />
            <SaveNote save={save} onOpenBoard={openBoard} />
          </div>
          {showBoard && (
            <>
              <button className="btn-ghost typing-return" onClick={closeBoard}>← Back to the test</button>
              <Leaderboard board={board} admin={admin} onRemove={async (r) => {
                if (!window.confirm(`Remove ${r.name || 'this'}'s score from the leaderboard?`)) return
                try { await removeScore(r.id); await loadBoard() }
                catch (e) { window.FITR.toast(e.message, 'error') }
              }} />
            </>
          )}
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

/* ── The test: Monkeytype, in a frame ──
   public/typing/monkeytype.html is Monkeytype's offline build (GPL-3.0),
   with a policy that stops it contacting outside services and a small
   script (fitr-skin.js) that posts each result here, and asks for the
   Tribune leaderboard when its leaderboard button is pressed. */
function MonkeyFrame({ onResult, onOpenBoard }) {
  const frame = useRef(null)
  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return
      const d = e.data
      if (d && d.type === 'fitr-open-leaderboard') { onOpenBoard(); return }
      if (!d || d.type !== 'fitr-typing-result') return
      const num = (v) => parseFloat(String(v || '').replace(/[^0-9.]/g, ''))
      onResult({
        wpm: Math.round(num(d.exactWpm) || num(d.wpm)),
        acc: Math.round(num(d.acc) * 10) / 10,
        raw: Math.round(num(d.raw)),
        testType: String(d.testType || '').replace(/\s+/g, ' ').trim()
      })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onResult, onOpenBoard])
  return (
    <div className="typing-frame">
      <iframe ref={frame} src="/typing/monkeytype.html" title="Typing test" allow="clipboard-write" />
      <p className="typing-credit">
        Typing test by <a href="https://github.com/monkeytypegame/monkeytype" target="_blank" rel="noreferrer">Monkeytype</a>,
        free software under the <a href="/typing/LICENSE-monkeytype.txt" target="_blank" rel="noreferrer">GNU GPL v3</a>,
        restyled by the Tribune (<a href="https://github.com/Fitrah-Tribune/fitr/tree/development/fitr/public/typing" target="_blank" rel="noreferrer">our changes</a>).
      </p>
    </div>
  )
}

function SaveNote({ save, onOpenBoard }) {
  const board = <button className="more-link-btn" onClick={onOpenBoard}>See the leaderboard</button>
  if (!save) return <p className="tr-save">Each result goes on the FIWA leaderboard if it’s your best. {board}</p>
  const text = save.state === 'saving' ? 'Saving to the leaderboard…'
    : save.state === 'skipped' ? `That was a “${save.testType}” test, so it doesn’t count. Switch to time 30, English for the leaderboard.`
      : save.state === 'error' ? `Couldn’t save this score: ${save.message}`
        : save.best ? `${save.wpm} wpm: a new personal best! You’re #${save.rank} on the leaderboard.`
          : `${save.wpm} wpm. Your best is still ${save.kept.wpm} wpm (#${save.rank} on the leaderboard).`
  return <p className="tr-save">{text} {save.state === 'done' && board}</p>
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
