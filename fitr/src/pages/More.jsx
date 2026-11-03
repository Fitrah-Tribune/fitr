import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useReactPage from '../lib/useReactPage'
import { TEST_SECONDS, PREVIEW_SIZE, listScores, findMine } from '../lib/typing'

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
      <div className="more-kicker">Student Challenge</div>
      <h3 className="more-lead-title"><Link to="/more/typing">How fast can FIWA type?</Link></h3>
      <p className="more-lead-deck">
        {TEST_SECONDS} seconds, plain English, one best score each. The Tribune Typing
        Test is open to every FIWA account.
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
              : list.slice(0, PREVIEW_SIZE).map((r, i) => (
                <div key={r.id} className={'more-top-row' + (r === mine ? ' me' : '')}>
                  <span className="r">{i + 1}</span>
                  <span className="n">{r.name || 'FIWA student'}{r === mine && <span className="lb-you">You</span>}</span>
                  <span className="w">{r.wpm}<small> wpm</small></span>
                </div>
              ))}
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
    Promise.all([Weather.current(), Weather.upcoming(5)])
      .then(([now, next]) => { if (live) setW({ state: 'ok', now, next }) })
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

/* A few keys, drawn in the site's line style. */
function KeysArt() {
  const keys = [
    [0, 0, 'F'], [1, 0, 'I'], [2, 0, 'T'], [3, 0, 'R'],
    [0.5, 1, 'W'], [1.5, 1, 'P'], [2.5, 1, 'M']
  ]
  return (
    <svg viewBox="0 0 200 110" className="more-keys">
      {keys.map(([x, y, k]) => (
        <g key={k} transform={`translate(${22 + x * 40} ${16 + y * 42})`}>
          <rect width="34" height="34" rx="4" />
          <text x="17" y="23">{k}</text>
        </g>
      ))}
      <rect x="42" y="100" width="116" height="6" rx="3" className="bar" />
    </svg>
  )
}
