import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'

// Route: /archive
// Content is filled in by the engine's Pages.archive.render().
const html = `
<section class="page active" id="page-archive">
  <div class="section-head">
    <h2>Archive</h2>
    <span class="sub">— every edition, preserved as printed</span>
    <div class="head-action admin-only">
      <button class="btn-add" onclick="Editor.newEdition()">+ Archive Edition</button>
    </div>
  </div>
  <div class="archive-intro">
    The archive preserves each edition as it was originally published — including any grammatical quirks or formatting from the time. Articles on the rest of the site receive silent corrections; the archive does not. It is a record of how Fitrah Tribune has grown.
  </div>
  <div id="archive-grid-area"><!-- rendered --></div>
</section>
`

export default function Archive() {
  useLegacyPage('archive')
  return <LegacyPage html={html} />
}
