import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'

// Route: /news
// Content is filled in by the engine's Pages.news.render().
const html = `
<section class="page active" id="page-news">
  <div class="section-head">
    <h2>News</h2>
    <span class="sub">— articles from every edition</span>
    <div class="head-action editable-only">
      <button class="btn-add" onclick="Editor.newArticle()">+ New Article</button>
    </div>
  </div>

  <div class="news-toolbar">
    <div class="filter-pills" id="news-tabs"><!-- rendered --></div>
    <div style="display: flex; gap: 0.7rem; align-items: center;">
      <div class="lang-toggle">
        <button class="active" data-lang="en" onclick="Pages.news.setLang('en')">EN</button>
        <button data-lang="id" onclick="Pages.news.setLang('id')">ID</button>
      </div>
      <input type="search" class="news-search" placeholder="Search articles…" oninput="Pages.news.search(this.value)" />
    </div>
  </div>
  <div class="subtab-bar" id="news-subtabs"><!-- rendered --></div>
  <div id="news-grid"><!-- rendered --></div>
</section>
`

export default function News() {
  useLegacyPage('news')
  return <LegacyPage html={html} />
}
