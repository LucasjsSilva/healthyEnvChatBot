import styles from '../styles/MetricsHint.module.css'

const MetricsHint = () => {
  return (
    <div className={styles.metricsHint}>
      <span className={styles.title}>Legenda:</span>
      <div className={styles.legendItem}>
        <div className={styles.hintBoxOk} />
        <span className={styles.hintText}>Saudável</span>
      </div>
      <div className={styles.legendItem}>
        <span className={styles.hintBoxReasonable} />
        <span className={styles.hintText}>Razoável</span>
      </div>
      <div className={styles.legendItem}>
        <span className={styles.hintBoxBad} />
        <span className={styles.hintText}>Precisa de atenção</span>
      </div>
    </div>
  );
}

export default MetricsHint;