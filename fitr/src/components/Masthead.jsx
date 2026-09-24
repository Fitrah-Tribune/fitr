import { mastheadUrl, ALT } from '../assets'

export default function Masthead() {
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <img
          src={mastheadUrl}
          alt={ALT.masthead}
          width={2500}
          height={560}
          style={{ display: 'block', height: '140px', width: 'auto', maxWidth: '100%', margin: '0 auto' }}
        />
      </div>
    </header>
  )
}
