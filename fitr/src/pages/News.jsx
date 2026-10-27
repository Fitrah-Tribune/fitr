import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'

// Route: /news
// Content is filled in by the engine's Pages.news.render().
const html = `
<section class="page active" id="page-news">
  <div class="section-head">
    <h2>News</h2>
    <span class="sub">— all our reporting</span>
    <div class="head-action editable-only">
      <button class="btn-add" onclick="Editor.newArticle()">+ New Article</button>
    </div>
  </div>

  <div class="section-tabs" id="news-sections"><!-- rendered --></div>
  <div class="news-toolbar">
    <div class="filter-pills" id="news-tabs"><!-- rendered --></div>
    <div class="news-tools">
      <div class="view-toggle" id="news-view"><!-- rendered --></div>
      <input type="search" class="news-search" placeholder="Search articles…" oninput="Pages.news.search(this.value)" />
    </div>
  </div>
  <div class="news-layout">
    <div id="news-grid"><!-- rendered --></div>
    <aside class="news-browse" id="news-browse"><!-- rendered --></aside>
  </div>
</section>
`

export default function News() {
  useLegacyPage('news')
  return <LegacyPage html={html} />
}
