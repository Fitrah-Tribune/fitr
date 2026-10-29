import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  // No tab is lit for a page that doesn't exist.
  useEffect(() => {
    const F = window.FITR
    if (!F) return
    F.ready.then(() => {
      F.Router.current = null
      F.renderTabs()
      F.setTitle('Page not found')
    })
  }, [])

  return (
    <section className="page active">
      <div className="empty-state">
        <h3>Page not found</h3>
        <p>That page doesn't exist. <Link to="/">Back to the front page</Link>.</p>
      </div>
    </section>
  )
}
