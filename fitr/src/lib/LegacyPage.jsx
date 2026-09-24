import { memo } from 'react'

/**
 * Renders a page's HTML exactly as the engine expects it.
 *
 * Why not JSX: the engine rewrites the inside of these pages directly
 * (lists, forms, the case inbox). If React owned those same elements the
 * two would fight and undo each other's changes. React owns everything
 * around the page; the engine owns what's inside it. When a page is later
 * rewritten as real React, replace its <LegacyPage> and drop its render()
 * from the engine.
 */
function LegacyPage({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

export default memo(LegacyPage)
