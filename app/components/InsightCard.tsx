import styles from '../styles/InsightCard.module.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'

interface InsightCardProps {
  text?: string
  loading: boolean
}

const InsightCard = ({ text, loading }: InsightCardProps) => {
  if (!loading && !text) return null

  return (
    <div className={styles.card}>
      <div className={styles.label}>
        <FontAwesomeIcon icon={faWandMagicSparkles} />
        Interpretação gerada por IA
      </div>
      {loading ? (
        <div className={styles.skeleton}>
          <div className={styles.skeletonLine} style={{ width: '95%' }} />
          <div className={styles.skeletonLine} style={{ width: '88%' }} />
          <div className={styles.skeletonLine} style={{ width: '92%' }} />
          <div className={styles.skeletonLine} style={{ width: '72%' }} />
        </div>
      ) : (
        <p className={styles.text}>{text}</p>
      )}
    </div>
  )
}

export default InsightCard
