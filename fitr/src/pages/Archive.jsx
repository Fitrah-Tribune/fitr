import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'

// Routes: /archive (the shelf of editions) and /archive/:id (one edition,
// where :id is its number). Filled in by the engine's Pages.archive.render().
const html = `
<section class="page active" id="page-archive">
  <div id="archive-area"><!-- rendered --></div>
</section>
`

export default function Archive() {
  useLegacyPage('archive')
  return <LegacyPage html={html} />
}
