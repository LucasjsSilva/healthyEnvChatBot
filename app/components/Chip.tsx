import styles from '../styles/Chip.module.css'

const Chip = ({ label }) => {
  return (
    <div className={styles.chip}>
      {label}
    </div>
  )
}

export default Chip