import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

/**
 * Hands a mounted page over to the engine.
 *
 * On every visit (and whenever the :id in the URL changes) this tells the
 * engine which page is showing, lets it fill the page with data, then
 * scrolls to a deep-linked spot if the URL has one (/forum/<postId>,
 * /feedback/submit, /about/standards …).
 *
 * `key` is the engine's name for the page: home, news, archive, forum,
 * corrections, about, article, tribunee.
 */
export default function useLegacyPage(key) {
  const { id = null } = useParams()

  useEffect(() => {
    let live = true
    const F = window.FITR
    F.ready.then(async () => {
      if (!live) return
      F.Router.current = key
      F.Router.params = { id }
      window.scrollTo({ top: 0 })
      await F.renderTabs()
      await F.Pages[key]?.render?.(F.Router.params)
      if (live) F.Router._deepLink(key, id)
    })
    return () => { live = false }
  }, [key, id])
}
