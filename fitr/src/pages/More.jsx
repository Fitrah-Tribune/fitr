import { Link } from 'react-router-dom'
import useReactPage from '../lib/useReactPage'
import { TEST_SECONDS } from '../lib/typing'

// Route: /more
// Extras from the Tribune. Each one is a card that opens its own page.
export default function More() {
  useReactPage('more', 'More')

  return (
    <section className="page active" id="page-more">
      <div className="section-head">
        <h2>More</h2>
        <span className="sub">— extras from the Tribune</span>
      </div>

      <div className="more-grid">
        <Link to="/more/typing" className="featured-card more-card">
          <div className="feat-img more-card-art" aria-hidden="true">
            <KeysArt />
          </div>
          <div className="feat-cat">Student Challenge</div>
          <h3 className="feat-title">The Tribune Typing Test</h3>
          <p className="feat-deck">
            How fast can you type? Take the {TEST_SECONDS}-second test and see where you
            land on the FIWA leaderboard.
          </p>
          <div className="feat-byline">
            <span>{TEST_SECONDS} seconds · English</span>
            <span className="more-card-tag">FIWA accounts</span>
          </div>
        </Link>
      </div>
    </section>
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
