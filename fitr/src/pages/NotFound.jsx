import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="page active">
      <div className="empty-state">
        <h3>Page not found</h3>
        <p>That page doesn't exist. <Link to="/">Back to the front page</Link>.</p>
      </div>
    </section>
  )
}
