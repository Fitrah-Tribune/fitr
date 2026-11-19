import { useCallback, useEffect, useRef, useState } from 'react'

// The Newsroom chat (Nov 2026): one room for the Tribunees, read by the
// supervisors (the Principal, the CAE and the advisor). It sits at the top
// of the Newsroom tab (Feedback.jsx); /chat sends people there.
// Messages can't be edited. A removed message stays on record: supervisors
// and admins still see what it said; everyone else sees only that it was
// removed. The rules live in supabase/schema.sql (collection "chat").

const MAX = 1000
const POLL_MS = 8000

export default function ChatRoom({ who }) {
  const [msgs, setMsgs] = useState(null)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const atBottom = useRef(true)

  const load = useCallback(() => window.FITR.Store.fresh('chat').then(
    list => {
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      setMsgs(list); setError('')
    },
    e => setError(e.message)), [])

  useEffect(() => {
    const first = setTimeout(load, 0)
    const t = setInterval(() => { if (!document.hidden) load() }, POLL_MS)
    return () => { clearTimeout(first); clearInterval(t) }
  }, [load])

  // Stay at the newest message, unless the reader scrolled up to read.
  useEffect(() => {
    const el = listRef.current
    if (el && atBottom.current) el.scrollTop = el.scrollHeight
  }, [msgs])
  const onScroll = () => {
    const el = listRef.current
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    try {
      // On Supabase the database sets the name and role from the account;
      // these are only for the demo.
      await window.FITR.Store.save('chat', {
        body, author: who.name, title: who.title, supervisor: who.sup, authorEmail: who.email,
      })
      setText(''); atBottom.current = true
      await load()
    } catch (e) { window.FITR.toast(e.message, 'error') }
    setSending(false)
  }

  const remove = async (m) => {
    if (!window.confirm('Remove this message? It stays on record for the supervisors.')) return
    try {
      await window.FITR.Store.save('chat', {
        ...m, removed: true, removedBy: who.name, removedTitle: who.title,
      })
      await load()
    } catch (e) { window.FITR.toast(e.message, 'error') }
  }

  const seesRemoved = who.sup || who.admin
  const canRemove = (m) => !m.removed && (who.sup || who.admin || (m.authorEmail || '').toLowerCase() === who.email)

  return (
    <div className="chat">
      <p className="chat-note">
        <strong>Supervised.</strong> The Principal, the CAE and our advisor can read everything here,
        including messages that were removed. Write as you would in class.
      </p>

      <div className="chat-list" ref={listRef} onScroll={onScroll} aria-live="polite">
        {msgs === null ? <p className="chat-empty">{error || 'Loading…'}</p>
          : !msgs.length ? <p className="chat-empty">No messages yet. Say salaam to the team.</p>
            : msgs.map((m, i) => {
              const prev = msgs[i - 1]
              const newDay = !prev || dayOf(prev.createdAt) !== dayOf(m.createdAt)
              return (
                <div key={m.id}>
                  {newDay && <div className="chat-day"><span>{dayLabel(m.createdAt)}</span></div>}
                  <Message m={m} seesRemoved={seesRemoved} canRemove={canRemove(m)} onRemove={() => remove(m)} />
                </div>
              )
            })}
      </div>

      <div className="chat-compose">
        <textarea
          value={text}
          maxLength={MAX}
          rows={2}
          placeholder={who.sup ? 'Write to the team…' : 'Write a message…'}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        />
        <div className="chat-compose-row">
          <span className="chat-count">{text.length > MAX - 150 ? `${text.length} / ${MAX}` : 'Enter sends · Shift+Enter for a new line'}</span>
          <button className="btn-navy" disabled={!text.trim() || sending} onClick={send}>Send</button>
        </div>
      </div>
    </div>
  )
}

function Message({ m, seesRemoved, canRemove, onRemove }) {
  const removedBy = m.removedBy ? `${m.removedBy}${m.removedTitle && m.removedTitle !== 'Admin' ? ` (${m.removedTitle})` : ''}` : ''
  return (
    <div className={'chat-msg' + (m.supervisor ? ' sup' : '') + (m.removed ? ' removed' : '')}>
      <div className="chat-meta">
        <b>{m.author || 'Tribunee'}</b>
        {m.title && <span className={'chat-title' + (m.supervisor ? ' sup' : '')}>{m.title}</span>}
        <span className="chat-time">{timeOf(m.createdAt)}</span>
        {canRemove && <button className="chat-remove" onClick={onRemove}>Remove</button>}
      </div>
      {m.removed ? (
        <>
          <p className="chat-gone">Message removed{removedBy ? ` by ${removedBy}` : ''}.</p>
          {seesRemoved && m.body && <p className="chat-body was">{m.body}</p>}
        </>
      ) : <p className="chat-body">{m.body}</p>}
    </div>
  )
}

const dayOf = (t) => new Date(t || 0).toDateString()
function dayLabel(t) {
  const d = new Date(t || 0)
  const today = new Date()
  const y = new Date(); y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}
const timeOf = (t) => new Date(t || 0).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
