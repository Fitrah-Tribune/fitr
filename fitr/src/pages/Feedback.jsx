import { useEffect, useState } from 'react'
import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'
import ChatRoom from '../components/ChatRoom'

// Route: /feedback  and  /feedback/submit
// Readers see Feedback & Corrections. The Tribunees and the supervisors see
// the same tab as the Newsroom (Nov 2026): the team chat, the editors'
// inbox and the public record, with their own "send a note" form folded
// away. The engine's Pages.corrections.render() fills both versions; the
// element ids it looks for are the same in each.

const submitAndSide = `
  <div class="fc-layout">
    <div class="fc-main">
      <div class="fc-block" id="fc-submit-block">
        <div class="fc-label"><span>Send a note to the editors</span></div>
        <div id="fc-submit-area"><!-- rendered by JS --></div>
      </div>

      <div class="fc-block" id="fc-mycases-block" style="display:none;">
        <div class="fc-label"><span>Your notes</span><span class="count" id="fc-mycases-count"></span></div>
        <div id="fc-mycases-area"><!-- rendered by JS --></div>
      </div>
    </div>

    <aside class="fc-side">
      <!-- The public/private boundary. This must never be quiet. -->
      <div class="fc-privacy">
        <h4>Only the editorial team sees your note</h4>
        <p>It is <strong>never published</strong>: not your name, not your words, not the fact that you wrote in.</p>
        <p>If it leads to a correction, <strong>only the correction</strong> goes on the public record, written by the editors in their own words.</p>
      </div>
      <div class="fc-legend">
        <div class="fc-q">What the statuses mean</div>
        <dl>
          <dt><span class="note-st recv">Received</span></dt><dd>The editors have your note.</dd>
          <dt><span class="note-st prog">In progress</span></dt><dd>The editors are checking it.</dd>
          <dt><span class="note-st fixed">Corrected</span></dt><dd>We fixed the story and logged it below.</dd>
          <dt><span class="note-st checked">Checked, no change needed</span></dt><dd>We looked into it; the story stands.</dd>
          <dt><span class="note-st passed">Thanks, passed to a writer</span></dt><dd>For tips: a Tribunee will follow it up.</dd>
          <dt><span class="note-st answered">Answered</span></dt><dd>For questions: the editors have replied.</dd>
        </dl>
        <p class="fc-legend-note">While a note is Received or In progress, the editors can reply and you can add to it. The last four close it; only an admin can reopen it.</p>
      </div>
    </aside>
  </div>
`

const publicRecord = `
  <div class="section-head" style="margin-top: 3.2rem;">
    <h2>The Public Record</h2>
    <span class="sub">— every correction we have made</span>
  </div>
  <div class="corrections-intro">
    <strong>Transparency is one of our four pillars.</strong> Our Editorial Standards promise that every correction is logged in public and that printed editions stay exactly as they were printed. When we fix a mistake in an article on this site, the article is updated so the next reader gets it right, and the correction is recorded here for as long as Fitrah Tribune exists.
  </div>
  <div id="corrections-list"><!-- rendered --></div>
`

const readerHtml = `
<section class="page active" id="page-corrections">
  <div class="section-head">
    <h2>Feedback &amp; Corrections</h2>
    <span class="sub">Spot an error, or know something we should report? Tell the editors.</span>
  </div>
  ${submitAndSide}
  ${publicRecord}
</section>
`

// The part of the Newsroom the engine fills (everything under the chat).
const newsroomHtml = `
  <div class="fc-block" id="fc-inbox-block" style="display:none;">
    <div class="fc-label"><span>Editors’ inbox</span><span class="count" id="fc-inbox-count"></span></div>
    <p class="nr-hint">Notes from readers. Every Tribunee and supervisor can read them; only admins reply.</p>
    <div id="fc-inbox-area"><!-- rendered by JS --></div>
  </div>

  <details class="nr-own" id="nr-own">
    <summary>Send a note to the editors yourself, or see your own notes</summary>
    ${submitAndSide}
  </details>

  ${publicRecord}
`

export default function Feedback() {
  // null until the engine knows who is signed in.
  const [who, setWho] = useState(null)

  useEffect(() => {
    let live = true
    const check = () => window.FITR.ready.then(async () => {
      const { Auth } = window.FITR
      const [room, sup, admin, title] = await Promise.all([Auth.isNewsroom(), Auth.isSupervisor(), Auth.isAdmin(), Auth.title()])
      const u = Auth.current()
      if (live) setWho({ room, sup, admin, title, email: (u.email || '').toLowerCase(), name: u.name })
    })
    check()
    window.addEventListener('fitr:user', check)
    return () => { live = false; window.removeEventListener('fitr:user', check) }
  }, [])

  if (!who) return null
  // A different key per version makes React start the page afresh, so the
  // engine fills the new one when someone signs in or out.
  return who.room ? <Newsroom key={'room:' + who.email} who={who} /> : <Reader key="reader" />
}

function Reader() {
  useLegacyPage('corrections')
  return <LegacyPage html={readerHtml} />
}

function Newsroom({ who }) {
  useLegacyPage('corrections')
  return (
    <section className="page active newsroom" id="page-corrections">
      <div className="section-head">
        <h2>Newsroom</h2>
        <span className="sub">— the team’s room: our chat, the editors’ inbox and the public record</span>
      </div>
      <div className="fc-block nr-chat">
        <div className="fc-label"><span>Team chat</span></div>
        <ChatRoom who={who} />
      </div>
      <LegacyPage html={newsroomHtml} />
    </section>
  )
}
