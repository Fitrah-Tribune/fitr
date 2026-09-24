import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'

// Route: /
// Content is filled in by the engine's Pages.home.render().
const html = `
<section class="page active" id="page-home">
  <div class="section-head">
    <h2>Front Page</h2>
    <span class="sub">— from the latest edition</span>
    <div class="head-action editable-only">
      <button class="btn-add" onclick="Editor.featureArticle()">+ Feature Article</button>
    </div>
  </div>
  <div id="home-featured-area"><!-- rendered by JS --></div>

  <div class="section-head" style="margin-top: 3rem;">
    <h2>More Stories</h2>
    <span class="sub">— recent reportage</span>
  </div>
  <div id="home-stories-area"><!-- rendered by JS --></div>

  <div class="home-strip" style="margin-top: 3rem;">
    <div class="strip-block">
      <div class="strip-head">
        <h3>From the Forum</h3>
        <a href="#" onclick="Router.go('forum'); return false;">View all →</a>
      </div>
      <div id="home-forum-preview"><!-- rendered by JS --></div>
    </div>
    <div class="strip-block">
      <div class="strip-head">
        <h3>Weather · Ciseeng</h3>
        <span style="font-family: var(--mono); font-size: 0.7rem; color: var(--ink-muted); letter-spacing: 0.16em;">TODAY</span>
      </div>
      <div class="weather-now">
        <div class="weather-icon"></div>
        <div>
          <div class="weather-temp">29<span class="unit">°C</span></div>
          <div class="weather-cond">Partly Cloudy</div>
          <div class="weather-loc">Bogor, West Java</div>
        </div>
      </div>
      <div class="weather-note">"What is news without weather?" — A house tradition since Edition I.</div>
    </div>
  </div>

  <div class="home-tipoff">
    <div>
      <h3>Spot Misinformation?</h3>
      <p>Help us keep the lighthouse lit. Flag a rumor or an error directly to the editorial team — privately, and on the record only if it becomes a correction.</p>
    </div>
    <button onclick="Pages.corrections.openSubmit()">Report a Tip</button>
  </div>
</section>
`

export default function Home() {
  useLegacyPage('home')
  return <LegacyPage html={html} />
}
