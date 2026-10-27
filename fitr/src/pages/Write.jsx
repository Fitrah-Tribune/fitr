import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'

// Routes: /write (new article), /write/:id (edit an article)
// The Writer's desk is built by the engine's Pages.write / Editor.mountDesk.
const html = `
<section class="page active" id="page-write">
  <div id="write-content"><!-- rendered --></div>
</section>
`

export default function Write() {
  useLegacyPage('write')
  return <LegacyPage html={html} />
}
