import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'

// Route: /forum  and  /forum/:postId
// Content is filled in by the engine's Pages.forum.render().
const html = `
<section class="page active" id="page-forum">
  <div class="section-head">
    <h2>Forum</h2>
    <span class="sub">announcements and posts from the Tribunees</span>
  </div>
  <div class="forum-layout">
    <div class="forum-main">
      <div id="forum-compose-area"><!-- the post box, Tribunees only --></div>
      <div class="forum-tabs" role="tablist" aria-label="Show">
        <button class="forum-tab active" role="tab" aria-selected="true" data-tab="all" onclick="Pages.forum.setTab('all')">All</button>
        <button class="forum-tab" role="tab" aria-selected="false" data-tab="announcement" onclick="Pages.forum.setTab('announcement')">Announcements</button>
        <button class="forum-tab" role="tab" aria-selected="false" data-tab="general" onclick="Pages.forum.setTab('general')">General</button>
      </div>
      <div id="forum-post-list"><!-- rendered --></div>
    </div>
    <aside class="forum-sidebar">
      <section class="fs-box">
        <h3>About the Forum</h3>
        <p>The Tribunees’ own feed: announcements from the editors and short posts from the team. Only Tribunees post here, and there are no replies &amp; comments.</p>
      </section>
      <section class="fs-box">
        <h3>Have something to say?</h3>
        <p>Send the editors a note: a mistake, a news tip, a question, or any other feedback.</p>
        <button class="fs-note" onclick="Pages.corrections.openSubmit()">Send a note</button>
      </section>
    </aside>
  </div>
</section>
`

export default function Forum() {
  useLegacyPage('forum')
  return <LegacyPage html={html} />
}
