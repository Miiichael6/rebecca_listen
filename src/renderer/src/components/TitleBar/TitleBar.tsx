/**
 * Title bar drawn by the page in the app colors: icon and name on a strip that
 * drags the window (double click maximizes, as usual). The native buttons sit
 * on the right, painted by Windows with the same background (`window.ts`).
 * The update button sits at the right end of the strip.
 */

import { APP_NAME, TITLE_BAR_HEIGHT } from '@shared/appInfo'
import icon from '../../../../../resources/icon.png'
import { UpdateButton } from '../UpdateButton/UpdateButton'
import styles from './TitleBar.module.css'

export function TitleBar(): React.JSX.Element {
  return (
    <header className={styles.bar} style={{ height: TITLE_BAR_HEIGHT }}>
      <img className={styles.icon} src={icon} alt="" draggable={false} />
      <span className={styles.title}>{APP_NAME}</span>
      <UpdateButton />
    </header>
  )
}
