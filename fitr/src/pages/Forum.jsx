import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'

// Route: /forum  and  /forum/:postId
// Content is filled in by the engine's Pages.forum.render().
const html = `
<section class="page active" id="page-forum">
  <div class="section-head">
    <h2>Forum</h2>
    <span class="sub">— announcements and posts from the Tribune</span>
  </div>
  <div class="forum-layout">
    <div class="forum-main">
      <div id="forum-compose-area"><!-- rendered based on auth --></div>
      <div class="forum-sort">
        <span class="sort-label">Sort</span>
        <button class="sort-btn active" data-sort="newest" onclick="Pages.forum.setSort('newest')">Newest</button>
        <button class="sort-btn" data-sort="oldest" onclick="Pages.forum.setSort('oldest')">Oldest</button>
        <button class="sort-btn" data-sort="announcement" onclick="Pages.forum.setSort('announcement')">Announcements</button>
        <button class="sort-btn" data-sort="general" onclick="Pages.forum.setSort('general')">General</button>
      </div>
      <div id="forum-post-list"><!-- rendered --></div>
    </div>
    <aside class="forum-sidebar">
      <div class="fs-block">
        <h4>Forum Rules</h4>
        <div class="fs-rules">
          <!-- PLACEHOLDER — Ammar / Aldebaraan to write the real rules. -->
          <p>Rules to be written by the editorial team.</p>
          <p>Announcements are posted by admins; general posts by any Tribunee.</p>
          <p>Posts that breach the Tribune's standards may be removed by an admin.</p>
        </div>
      </div>
      <div class="fs-block fs-tip">
        <h4>Spot Misinformation?</h4>
        <p>Help us keep the lighthouse lit. Flag a rumor or correction directly to the editorial team.</p>
        <button onclick="Pages.corrections.openSubmit()">Report a Tip</button>
      </div>
    </aside>
  </div>
</section>
`

export default function Forum() {
  useLegacyPage('forum')
  return <LegacyPage html={html} />
}
