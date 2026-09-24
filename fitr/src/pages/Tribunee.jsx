import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'

// Route: /tribunee/:tribuneeId
// Content is filled in by the engine's Pages.tribunee.render().
const html = `
<section class="page active" id="page-tribunee">
  <div id="tribunee-content"><!-- rendered --></div>
</section>
`

export default function Tribunee() {
  useLegacyPage('tribunee')
  return <LegacyPage html={html} />
}
