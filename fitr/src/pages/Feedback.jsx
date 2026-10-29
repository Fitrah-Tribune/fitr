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

  <div class="fc-block" id="fc-inbox-block" style="display:none;">
    <div class="fc-label"><span>Editors’ inbox · Tribunees only</span><span class="count" id="fc-inbox-count"></span></div>
    <div id="fc-inbox-area"><!-- rendered by JS --></div>
  </div>

  <div class="section-head" style="margin-top: 3.2rem;">
    <h2>The Public Record</h2>
    <span class="sub">— every correction we have made</span>
  </div>
  <div class="corrections-intro">
    <strong>Transparency is one of our four pillars.</strong> Our Editorial Standards promise that every correction is logged in public and that printed editions stay exactly as they were printed. When we fix a mistake in an article on this site, the article is updated so the next reader gets it right, and the correction is recorded here for as long as Fitrah Tribune exists.
  </div>
  <div id="corrections-list"><!-- rendered --></div>
</section>
`

export default function Feedback() {
  useLegacyPage('corrections')
  return <LegacyPage html={html} />
}
