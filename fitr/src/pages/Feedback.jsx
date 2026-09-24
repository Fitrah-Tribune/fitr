import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'

// Route: /feedback  and  /feedback/submit
// Content is filled in by the engine's Pages.corrections.render().
const html = `
<section class="page active" id="page-corrections">
  <div class="section-head">
    <h2>Feedback &amp; Corrections</h2>
    <span class="sub">— tell us what we got wrong</span>
  </div>

  <!-- The public/private boundary. This must never be quiet. -->
  <div class="fc-privacy">
    <h4>Your submission is private</h4>
    <p>What you send us is read only by the Tribune. It is <strong>never published</strong> — not your name, not your words, not the fact that you wrote to us.</p>
    <p>If what you tell us leads to a correction, <strong>only the correction is published</strong> — a plain note saying what we got wrong and that we fixed it. Your message stays between us.</p>
  </div>

  <div class="fc-block" id="fc-submit-block">
    <div class="fc-label"><span>Send us a correction</span></div>
    <div id="fc-submit-area"><!-- rendered by JS --></div>
  </div>

  <div class="fc-block" id="fc-mycases-block" style="display:none;">
    <div class="fc-label"><span>Your cases</span><span class="count" id="fc-mycases-count"></span></div>
    <div id="fc-mycases-area"><!-- rendered by JS --></div>
  </div>

  <div class="fc-block" id="fc-inbox-block" style="display:none;">
    <div class="fc-label"><span>Case inbox — Tribunees only</span><span class="count" id="fc-inbox-count"></span></div>
    <div id="fc-inbox-area"><!-- rendered by JS --></div>
  </div>

  <div class="section-head" style="margin-top: 3.2rem;">
    <h2>The Public Record</h2>
    <span class="sub">— every correction we have made</span>
  </div>
  <div class="corrections-intro">
    <strong>Transparency is non-negotiable.</strong> When we update an article on this site, the article itself is silently corrected — a clean read for the next visitor. But the fact that a correction was made is logged here, in public, for as long as Fitrah Tribune exists. The archive editions, however, remain untouched — preserved as originally printed.
  </div>
  <div id="corrections-list"><!-- rendered --></div>
</section>
`

export default function Feedback() {
  useLegacyPage('corrections')
  return <LegacyPage html={html} />
}
