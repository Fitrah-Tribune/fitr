import { useEffect, useState } from 'react'

/**
 * For pages written in real React (no engine HTML inside).
 *
 * Tells the engine which tab to light up and what to call the browser tab,
 * and returns { ready, version }: `ready` turns true once the engine knows
 * who is signed in, and `version` goes up whenever the engine asks the
 * current page to redraw (signing in or out, editing mode on or off), so
 * the page can re-read Auth and the Store.
 */
export default function useReactPage(key, title) {
  const [ready, setReady] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let live = true
    const F = window.FITR
    const bridge = { render: () => { if (live) setVersion(v => v + 1) } }
    F.ready.then(async () => {
      if (!live) return
      F.Router.current = key
      F.Router.params = {}
      F.Pages[key] = bridge
      F.setTitle(title)
      window.scrollTo({ top: 0 })
      await F.renderTabs()
      if (live) setReady(true)
    })
    return () => {
      live = false
      if (F.Pages[key] === bridge) delete F.Pages[key]
    }
  }, [key, title])

  return { ready, version }
}
