import { markUrl } from '../assets'
import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'

// Route: /about, /about/standards, /about/tribunees
// Content is filled in by the engine's Pages.about.render().
const html = `
<section class="page active" id="page-about">
  <div class="about-hero">
    <div class="about-hero-img"><img src="__MARK__" alt="Fitrah Tribune lighthouse" /></div>
    <div class="about-hero-text">
      <div class="eyebrow">About Us · Fitrah Tribune</div>
      <h2>A lighthouse in the <em>storm of misinformation.</em></h2>
      <p class="lead">Fitrah Tribune is a student-driven newspaper community at Fitrah Islamic World Academy. We are the community's record of itself — written from within FIWA, for the readers who live it.</p>
      <p>We were born out of frustration with the rumor-mills that travel faster than verified facts in any school. Our promise is simple: we publish what we can verify, we correct what we get wrong, and we leave the record for everyone to see.</p>
      <p>Our newspapers ship every fortnight in English, with Indonesian translations following soon after. The website is a younger sibling — built to extend the reach of the print, host community discussion, and keep our corrections honest.</p>
    </div>
  </div>

  <div class="section-head"><h2>Our Pillars</h2><span class="sub">— what guides every story we publish</span></div>
  <div class="values-row">
    <div class="value-card">
      <h4>Clarity</h4>
      <p>Every article is researched before it is written. Claims we cannot verify are not published as fact. Where uncertainty exists, we name it openly.</p>
    </div>
    <div class="value-card">
      <h4>Approachability</h4>
      <p>Not too professional, not too casual. We write the way a thoughtful older sibling would explain something — with care, but without stiffness.</p>
    </div>
    <div class="value-card">
      <h4>Trustedness</h4>
      <p>Trust is built slowly, through consistency: doing what we say we will do, edition after edition. The Tribune you read next is built on the standard of the one before.</p>
    </div>
    <div class="value-card">
      <h4>Transparency</h4>
      <p>No fact is ever altered, fabricated, or misrepresented. Editorial judgment shapes which facts we foreground — never the underlying truth itself.</p>
    </div>
  </div>

  <div class="standards-block">
    <h3>Editorial Standards</h3>
    <p class="standards-sub">The promises we hold ourselves to.</p>
    <div class="standards-grid">
      <div class="standards-col do">
        <h5>What we do</h5>
        <ul>
          <li>Verify claims through at least one direct source before publishing.</li>
          <li>Submit every article to the CAE for appropriateness review before publication.</li>
          <li>Seek consent before naming individuals in sensitive coverage.</li>
          <li>Disclose any AI assistance used in research or drafting.</li>
          <li>Log every correction publicly on the Corrections page.</li>
          <li>Preserve archived editions exactly as they were printed, errors included.</li>
        </ul>
      </div>
      <div class="standards-col dont">
        <h5>What we don't do</h5>
        <ul>
          <li>Publish unverified rumor, even when it's interesting.</li>
          <li>Quietly edit print articles to hide past mistakes.</li>
          <li>Name individuals in sensitive coverage without their consent.</li>
          <li>Delete criticism from our public record simply because we disagree with it.</li>
          <li>Accept payment, sponsorship, or favors that influence coverage.</li>
          <li>Hide who wrote what — every article carries a byline.</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="section-head" style="margin-top: 3.5rem;">
    <h2>The Tribunees</h2>
    <span class="sub">— our team of writers, editors, and translators</span>
    <div class="head-action admin-only">
      <button class="btn-add" onclick="Editor.newTribunee()">+ Add Tribunee</button>
    </div>
  </div>
  <div id="tribunees-grid-area"><!-- rendered --></div>
</section>
`.replace('__MARK__', markUrl)

export default function About() {
  useLegacyPage('about')
  return <LegacyPage html={html} />
}
