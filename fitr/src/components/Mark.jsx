import { markUrl, ALT } from '../assets'

/** The lighthouse on its own. `decorative` hides it from screen readers. */
export default function Mark({ decorative = false, className }) {
  return <img src={markUrl} alt={decorative ? '' : ALT.mark} aria-hidden={decorative || undefined} className={className} />
}
