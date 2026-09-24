import { useEffect } from 'react'
import { Link, Outlet } from 'react-router-dom'
import Masthead from './Masthead'
import Mark from './Mark'

/**
 * Everything around the page: top band, editing banner, masthead, nav,
 * footer, and the modal/toast hosts the engine draws into.
 *
 * #tabs-list and #tabs-user are left empty on purpose. The engine fills
 * them (it knows who is signed in and whether they are a Tribunee).
 */
export default function Layout() {
  useEffect(() => { window.FITR.mountChrome() }, [])
  const F = () => window.FITR

  return (
    <>
      <div className="tribune-band">
        <span className="band-name">Fitrah Tribune</span>
        <span>EST. 2026</span>
      </div>

      <div className="edit-banner" id="edit-banner" style={{ display: 'none' }}>
        <div className="eb-left">
          <span className="eb-dot"></span>
          <span>Editing Mode — changes are live</span>
        </div>
        <button onClick={() => F().Editor.toggle(false)}>Exit editing</button>
      </div>

      <Masthead />

      <nav className="tabs">
        <div className="tabs-inner">
          <div className="tabs-list" id="tabs-list"></div>
          <div className="tabs-user" id="tabs-user"></div>
        </div>
      </nav>

      <div className="page-shell">
        <Outlet />
      </div>

      <footer className="tribune-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-mark">
              <Mark decorative />
              <span className="name">Fitrah Tribune</span>
            </div>
            <p>A student-driven newspaper community at Fitrah Islamic World Academy — keeping the light steady against the storm of misinformation.</p>
          </div>
          <div className="footer-col">
            <h5>Read</h5>
            <ul>
              <li><Link to="/">Front Page</Link></li>
              <li><Link to="/news">News</Link></li>
              <li><Link to="/archive">Archive</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Engage</h5>
            <ul>
              <li><Link to="/forum">Forum</Link></li>
              <li><Link to="/feedback">Feedback &amp; Corrections</Link></li>
              <li><Link to="/feedback/submit">Report a Tip</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>About</h5>
            <ul>
              <li><Link to="/about">Our Mission</Link></li>
              <li><Link to="/about/standards">Editorial Standards</Link></li>
              <li><Link to="/about/tribunees">The Tribunees</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Fitrah Tribune · All bylines retained by their authors</span>
          <span>Documenting FIWA And Beyond</span>
        </div>
      </footer>

      <div className="modal-backdrop" id="modal-backdrop"
           onClick={e => { if (e.target === e.currentTarget) F().Modal.close() }}>
        <div className="modal" id="modal-shell">
          <div className="modal-head">
            <h3 id="modal-title">—</h3>
            <button className="modal-close" onClick={() => F().Modal.close()}>×</button>
          </div>
          <div className="modal-body" id="modal-body"></div>
          <div className="modal-foot" id="modal-foot"></div>
        </div>
      </div>

      <div className="toast-container" id="toast-container"></div>
    </>
  )
}
