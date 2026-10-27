import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'

// Route: /feedback  and  /feedback/submit
// Content is filled in by the engine's Pages.corrections.render().
const html = `
<section class="page active" id="page-corrections">
  <div class="section-head">
    <h2>Feedback &amp; Corrections</h2>
    <span class="sub">Spot an error, or know something we should report? Tell the editors.</span>
  </div>

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
        <div class="fc-q">How it works</div>
        <dl>
          <dt><span class="note-st open">Open</span></dt><dd>The editors can reply under your note, and you can add to it.</dd>
          <dt><span class="note-st closed">Closed</span></dt><dd>The conversation is finished and can’t be changed. Only an admin can reopen it.</dd>
        </dl>
      </div>
    </aside>
  </div>

  <div class="fc-block" id="fc-inbox-block" style="display:none;">
    <div class="fc-label"><span>Editors’ inbox · Tribunees only</span><span class="count" id="fc-inbox-count"></span></div>
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
