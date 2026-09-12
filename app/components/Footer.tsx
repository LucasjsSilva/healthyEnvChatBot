import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import styles from '../styles/Footer.module.css'

const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.brandColumn}>
          <span className={styles.brand}>HealthyEnv</span>
          <span className={styles.tagline}>
            Avaliação da saúde de repositórios de software open source.
          </span>
        </div>
        <div className={styles.linksGroup}>
          <span className={styles.linksGroupTitle}>Produto</span>
          <Link href='/dashboard/datasets'>
            <a className={styles.link}>Datasets</a>
          </Link>
          <Link href='/about'>
            <a className={styles.link}>Sobre</a>
          </Link>
          <a
            href='https://github.com/SERG-UFPI/healthyEnv'
            className={styles.link}
            target='_blank'
            rel='noreferrer'
          >
            <FontAwesomeIcon icon={faGithub} className={styles.linkIcon} />
            GitHub
          </a>
        </div>
        <div className={styles.linksGroup}>
          <span className={styles.linksGroupTitle}>Recursos</span>
          <Link href='/how-it-works'>
            <a className={styles.link}>Como funciona</a>
          </Link>
          <Link href='/docs'>
            <a className={styles.link}>Conceitos</a>
          </Link>
          <Link href='/api-docs'>
            <a className={styles.link}>API</a>
          </Link>
        </div>
      </div>
      <div className={styles.bottomBar}>
        <span>
          Projeto de TCC — Universidade Federal do Piauí (UFPI) · © {year} HealthyEnv
        </span>
      </div>
    </footer>
  )
}

export default Footer
