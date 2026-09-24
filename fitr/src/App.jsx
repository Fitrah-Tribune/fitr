import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import News from './pages/News'
import Archive from './pages/Archive'
import Forum from './pages/Forum'
import Feedback from './pages/Feedback'
import About from './pages/About'
import Article from './pages/Article'
import Tribunee from './pages/Tribunee'
import NotFound from './pages/NotFound'

/* Lets the engine's Router.go('forum') drive React Router. */
function NavigateBridge() {
  const navigate = useNavigate()
  useEffect(() => {
    window.FITR.Router._navigate = navigate
    return () => { window.FITR.Router._navigate = null }
  }, [navigate])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <NavigateBridge />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="news" element={<News />} />
          <Route path="archive" element={<Archive />} />
          <Route path="forum" element={<Forum />} />
          <Route path="forum/:id" element={<Forum />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="feedback/:id" element={<Feedback />} />
          <Route path="about" element={<About />} />
          <Route path="about/:id" element={<About />} />
          <Route path="article/:id" element={<Article />} />
          <Route path="tribunee/:id" element={<Tribunee />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
