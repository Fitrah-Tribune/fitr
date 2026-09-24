import LegacyPage from '../lib/LegacyPage'
import useLegacyPage from '../lib/useLegacyPage'

// Route: /article/:articleId
// Content is filled in by the engine's Pages.article.render().
const html = `
<section class="page active" id="page-article">
  <div id="article-content"><!-- rendered --></div>
</section>
`

export default function Article() {
  useLegacyPage('article')
  return <LegacyPage html={html} />
}
