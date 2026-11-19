import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useReactPage from '../lib/useReactPage'
import { TEST_SECONDS, PREVIEW_SIZE, listScores, findMine, topScores } from '../lib/typing'

// Route: /more
// Extras from the Tribune. The Student Challenge leads, like a front-page
// story; smaller extras (the weather, for now) sit in the side column.
export default function More() {
  const { ready, version } = useReactPage('more', 'More')

  return (
    <section className="page active" id="page-more">
      <div className="section-head">
        <h2>More</h2>
        <span className="sub">— extras from the Tribune</span>
      </div>

      <div className="more-layout">
        <ChallengeLead ready={ready} version={version} />
        <aside className="more-rail">
          <WeatherBox />
        </aside>
      </div>
    </section>
  )
}

/* ── The lead: the Student Challenge, with the top 5 ── */
function ChallengeLead({ ready, version }) {
  const F = window.FITR
  const fiwa = ready && F.Auth.isFiwa()
  const [board, setBoard] = useState({ loading: true, list: [] })

  useEffect(() => {
    if (!ready || !window.FITR.Auth.isFiwa()) return
    let live = true
    listScores()
      .then(list => { if (live) setBoard({ loading: false, list }) })
      .catch(e => { if (live) setBoard({ loading: false, list: [], error: e.message }) })
    return () => { live = false }
  }, [ready, version])

  const list = board.list
  const mine = fiwa ? findMine(list) : null
  const count = list.length

  return (
    <article className="more-lead">
      <Link to="/more/typing" className="feat-img more-card-art more-lead-art" aria-hidden="true" tabIndex={-1}>
        <KeysArt />
      </Link>
      <div className="more-kicker">Edition VI · Student Challenge No. 3</div>
      <h3 className="more-lead-title"><Link to="/more/typing">Typing Test</Link></h3>
      <p className="more-lead-deck">
        Our third Student Challenge, and the first one held on the website. Type
        plain English for {TEST_SECONDS} seconds; your best score goes on the board.
        Open to every FIWA account.
      </p>
      <div className="more-lead-row">
        <Link to="/more/typing" className="btn-navy">Take the test</Link>
        {fiwa && count > 0 && <span className="more-lead-meta">{count} {count === 1 ? 'person' : 'people'} on the board</span>}
      </div>

      <div className="more-top">
        <div className="more-top-head">
          <span>Leading so far</span>
          {fiwa && count > 0 && <Link to="/more/typing?view=leaderboard">Full leaderboard →</Link>}
        </div>
        {!ready ? null : !fiwa ? (
          <p className="more-top-note">
            {F.Auth.isGuest()
              ? <>The leaderboard is for the FIWA community. <button className="more-link-btn" onClick={() => F.SignIn.open()}>Sign in</button> with your @fiwa.sch.id account to see who’s leading.</>
              : <>The leaderboard is for FIWA accounts. Sign in with your @fiwa.sch.id account to see who’s leading.</>}
          </p>
        ) : board.loading ? <p className="more-top-note">Loading…</p>
          : board.error ? <p className="more-top-note">The leaderboard couldn’t load: {board.error}</p>
            : !count ? <p className="more-top-note">No scores yet. Be the first on the board.</p>
              : <>
                {topScores(list, PREVIEW_SIZE).map(r => (
                  <div key={r.id} className={'more-top-row' + (r === mine ? ' me' : '') + (r.tribunee ? ' trib' : '')}>
                    <span className="r">{r.place || ''}</span>
                    <span className="n">{r.name || 'FIWA student'}{r.tribunee && <span className="lb-trib">Tribunee</span>}{r === mine && <span className="lb-you">You</span>}</span>
                    <span className="w">{r.wpm}<small> wpm</small></span>
                  </div>
                ))}
                {topScores(list, PREVIEW_SIZE).some(r => r.tribunee) && (
                  <p className="more-top-foot">Tribunees in grey don’t count towards the final ranking.</p>
                )}
              </>}
      </div>
    </article>
  )
}

/* ── The side column: weather at FIWA, from BMKG ── */
function WeatherBox() {
  const [w, setW] = useState({ state: 'loading' })

  useEffect(() => {
    let live = true
    const { Weather } = window.FITR
    Promise.all([Weather.current(), Weather.upcoming(5), Weather.alerts()])
      .then(([now, next, alerts]) => { if (live) setW({ state: 'ok', now, next, alerts }) })
      .catch(() => { if (live) setW({ state: 'error' }) })
    return () => { live = false }
  }, [])

  const Icons = window.FITR.WeatherIcons
  const hourOf = (s) => String(s.local_datetime || '').slice(11, 16)
  const night = (s) => { const h = Number(hourOf(s).slice(0, 2)); return h >= 18 || h < 6 }
  const icon = (s) => ({ __html: Icons.html(Icons.forCode(s.weather, night(s))) })

  return (
    <div className="more-box">
      <div className="feat-side-head">Weather at FIWA</div>
      {w.state === 'loading' ? <p className="more-top-note">Loading…</p>
        : w.state === 'error' ? <p className="more-top-note">Weather unavailable right now.</p>
          : (
            <>
              {w.alerts.slice(0, 2).map(a => <WeatherAlert key={a.id || a.event} a={a} />)}
              <div className="more-wx-now">
                <span className="more-wx-icon" dangerouslySetInnerHTML={icon(w.now)} />
                <div>
                  <b>{Math.round(Number(w.now.t))}°C</b>
                  <span>{w.now.weather_desc_en || w.now.weather_desc}</span>
                  <small>Karihkil, Ciseeng · BMKG{hourOf(w.now) && `, ${hourOf(w.now)}`}</small>
                </div>
              </div>
              {w.next.length > 1 && (
                <div className="more-wx-hours">
                  {w.next.filter(s => s.local_datetime !== w.now.local_datetime).slice(0, 4).map(s => (
                    <div key={s.local_datetime}>
                      <small>{hourOf(s)}</small>
                      <span className="more-wx-icon sm" dangerouslySetInnerHTML={icon(s)} />
                      <span>{Math.round(Number(s.t))}°</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
    </div>
  )
}

/* A BMKG warning that covers FIWA: red, orange or yellow by its severity. */
function WeatherAlert({ a }) {
  const { Weather } = window.FITR
  const lv = Weather.level(a)
  const until = Weather.until(a)
  const web = /^https:\/\/[^/]*bmkg\.go\.id\//.test(a.web || '') ? a.web : 'https://www.bmkg.go.id/peringatan-dini'
  return (
    <div className={'wx-alert ' + lv.cls} role="alert">
      <div className="wx-alert-head">
        <span className="wx-alert-level">{lv.label}</span>
        {until && <span className="wx-alert-until">until {until} WIB</span>}
      </div>
      <div className="wx-alert-title">{a.event || a.headline || 'Weather warning'}</div>
      {a.headline && a.event && a.headline !== a.event && <div className="wx-alert-text">{a.headline}</div>}
      <a className="wx-alert-link" href={web} target="_blank" rel="noreferrer">Details from BMKG</a>
    </div>
  )
}

/* A few keys, drawn in the site's line style. */
function KeysArt() {
  // A plain keyboard, three staggered rows and a space bar, with the
  // challenge's edition and number on the keys (Edition VI, No. 3).
  const rows = [
    { y: 0, x0: 0, n: 7 }, { y: 1, x0: 0.4, n: 6 }, { y: 2, x0: 0.9, n: 5 },
  ]
  const labels = { '0-0': 'E', '0-1': 'D', '0-3': 'V', '0-4': 'I', '2-1': 'N', '2-2': 'o', '2-3': '3' }
  return (
    <svg viewBox="0 0 220 128" className="more-keys">
      {rows.flatMap((r, ri) => Array.from({ length: r.n }, (_, i) => {
        const k = labels[`${ri}-${i}`]
        return (
          <g key={`${ri}-${i}`} transform={`translate(${12 + (r.x0 + i) * 28.5} ${8 + r.y * 30})`}>
            <rect width="25" height="25" rx="3.5" className={k ? 'on' : ''} />
            {k && <text x="12.5" y="17.5">{k}</text>}
          </g>
        )
      }))}
      <rect x="55" y="100" width="110" height="18" rx="3.5" className="bar" />
    </svg>
  )
}
