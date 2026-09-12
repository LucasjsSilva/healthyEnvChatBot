import styles from '../styles/SkeletonRepoList.module.css'

const CHIP_WIDTHS = [64, 80, 72, 68, 96, 84, 76]

interface SkeletonRepoListProps {
  count?: number
}

const SkeletonRepoList = ({ count = 6 }: SkeletonRepoListProps) => {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.card}>
          <div
            className={`${styles.shimmer} ${styles.title}`}
            style={{ width: `${32 + (index % 3) * 8}%` }}
          />
          <div className={styles.chips}>
            {CHIP_WIDTHS.map((width, chipIndex) => (
              <div
                key={chipIndex}
                className={`${styles.shimmer} ${styles.chip}`}
                style={{ width }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default SkeletonRepoList
