import { useCallback, useEffect, useState } from 'react'
import useReactPage from '../lib/useReactPage'

// Route: /whats-new
// The change log (Nov 2026): what changed on the site with each update.
// Each entry is written for one audience, and each rank sees its own
// entries and the ones below it: everyone → FIWA → Tribunees →
// supervisors & admins. The database does the filtering (collection
// "changes" in supabase/schema.sql); only admins write entries.

const AUDIENCES = [
  { id: 'everyone',  label: 'Everyone' },
  { id: 'fiwa',      label: 'FIWA accounts' },
  { id: 'tribunees', label: 'Tribunees' },
  { id: 'staff',     label: 'Supervisors & admins' },
]
const audienceLabel = (id) => (AUDIENCES.find(a => a.id === id) || AUDIENCES[0]).label

export default function Changes() {
  const { ready, version } = useReactPage('changes', 'What’s new')
  const [list, setList] = useState(null)
  const [admin, setAdmin] = useState(false)
  const [ranked, setRanked] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    const F = window.FITR
    const [items, adm, trib, sup] = await Promise.all([
      F.Store.fresh('changes'), F.Auth.isAdmin(), F.Auth.isTribunee(), F.Auth.isSupervisor(),
    ])
    // The demo has no database to filter by rank, so it filters here.
    const rank = adm || sup ? 3 : trib ? 2 : F.Auth.isFiwa() ? 1 : 0
    const need = { everyone: 0, fiwa: 1, tribunees: 2, staff: 3 }
    const mine = items.filter(c => rank >= (need[c.audience || 'everyone'] ?? 9))
    mine.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || (b.createdAt || 0) - (a.createdAt || 0))
    setList(mine); setAdmin(adm); setRanked(rank >= 2)
  }, [])

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(load, 0)
    return () => clearTimeout(t)
  }, [ready, version, load])

  const remove = async (c) => {
    if (!window.confirm(`Delete “${c.title}” from the change log?`)) return
    try { await window.FITR.Store.remove('changes', c.id); await load() }
    catch (e) { window.FITR.toast(e.message, 'error') }
  }

  // Entries from the same day sit under one date.
  const days = []
  for (const c of list || []) {
    const last = days[days.length - 1]
    if (last && last.date === c.date) last.items.push(c)
    else days.push({ date: c.date, items: [c] })
  }

  return (
    <section className="page active" id="page-changes">
      <div className="section-head">
        <h2>What’s new</h2>
        <span className="sub">— changes to the website, newest first</span>
      </div>

      {admin && !editing && (
        <button className="btn-navy changes-add" onClick={() => setEditing({ date: today(), audience: 'everyone', title: '', body: '' })}>Add a change</button>
      )}
      {editing && <EntryForm entry={editing} onDone={async (saved) => { setEditing(null); if (saved) await load() }} />}

      {list === null ? null : !list.length ? (
        <p className="changes-empty">No changes logged yet.</p>
      ) : days.map(d => (
        <div className="changes-day" key={d.date || 'undated'}>
          <h3 className="changes-date">{dateLabel(d.date)}</h3>
          {d.items.map(c => (
            <article className="changes-item" key={c.id}>
              <div className="changes-head">
                <h4>{c.title}</h4>
                {ranked && c.audience && c.audience !== 'everyone' && <span className={'changes-for ' + c.audience}>For {audienceLabel(c.audience).toLowerCase().replace('fiwa', 'FIWA')}</span>}
              </div>
              {c.body && String(c.body).split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
              {admin && (
                <div className="changes-actions">
                  <button className="btn-ghost" onClick={() => setEditing(c)}>Edit</button>
                  <button className="btn-ghost danger" onClick={() => remove(c)}>Delete</button>
                </div>
              )}
            </article>
          ))}
        </div>
      ))}
    </section>
  )
}

function EntryForm({ entry, onDone }) {
  const [f, setF] = useState(entry)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = async () => {
    if (!f.title.trim()) { window.FITR.toast('Give the change a title', 'error'); return }
    setBusy(true)
    try { await window.FITR.Store.save('changes', { ...f, title: f.title.trim(), body: (f.body || '').trim() }); onDone(true) }
    catch (e) { window.FITR.toast(e.message, 'error'); setBusy(false) }
  }
  return (
    <div className="changes-form">
      <div className="field"><label>What changed</label><input value={f.title} onChange={set('title')} placeholder="e.g. The Newsroom chat is open" /></div>
      <div className="field"><label>Details (optional)</label><textarea rows={4} value={f.body || ''} onChange={set('body')} placeholder="A sentence or two. A blank line starts a new paragraph." /></div>
      <div className="changes-form-row">
        <div className="field"><label>Date</label><input type="date" value={f.date || ''} onChange={set('date')} /></div>
        <div className="field">
          <label>Who sees it</label>
          <select value={f.audience || 'everyone'} onChange={set('audience')}>
            {AUDIENCES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
      </div>
      <p className="field-hint">Each rank sees its own entries and the ones below it: supervisors and admins see everything.</p>
      <div className="changes-actions">
        <button className="btn-navy" disabled={busy} onClick={save}>{f.id ? 'Save' : 'Add'}</button>
        <button className="btn-ghost" onClick={() => onDone(false)}>Cancel</button>
      </div>
    </div>
  )
}

const today = () => {
  const d = new Date(Date.now() + 7 * 3600e3) // Jakarta date
  return d.toISOString().slice(0, 10)
}
const dateLabel = (s) => {
  if (!s) return 'Undated'
  const d = new Date(s + 'T00:00:00')
  return isNaN(d) ? s : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
