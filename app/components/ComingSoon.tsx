import Head from 'next/head'
import Header from './Header'
import Footer from './Footer'
import styles from '../styles/ComingSoon.module.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faScrewdriverWrench } from '@fortawesome/free-solid-svg-icons'

interface ComingSoonProps {
  pageTitle: string
  title: string
  description: string
}

const ComingSoon = (props: ComingSoonProps) => {
  return (
    <>
      <Head>
        <title>{props.pageTitle}</title>
      </Head>
      <Header />
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <span className={styles.icon}>
            <FontAwesomeIcon icon={faScrewdriverWrench} />
          </span>
          <h1 className={styles.title}>{props.title}</h1>
          <p className={styles.description}>{props.description}</p>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default ComingSoon
