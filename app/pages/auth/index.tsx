import styles from '../../styles/Auth.module.css'
import Head from 'next/head'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import Link from "next/link";
import { useEffect, useState } from 'react';
import Router, { useRouter } from "next/router";
import Constants from '../../utils/constants';

export default function Auth() {
  const router = useRouter()
  const [showAuthOptions, setShowAuthOptions] = useState(false);

  function checkCurrentAuth() {
    const data = JSON.parse(sessionStorage.getItem('userData'))

    if (data == undefined) {
      setShowAuthOptions(true)
    } else {
      if ((Date.now() - data['timestamp']) > 86400000) {
        setShowAuthOptions(true)
      } else {
        Router.push('/dashboard/datasets')
      }
    }
  }

  useEffect(
    () => {
      checkCurrentAuth()
    }, [])

  return (
    <>
      <Head>
        <title>Entrar - HealthyEnv</title>
      </Head>
      {showAuthOptions ? (
        <div className={styles.auth}>
          <div className={styles.card}>
            <span className={styles.brand}>HealthyEnv</span>
            <span className={styles.title}>Bem-vindo(a) de volta</span>
            <span className={styles.subtitle}>
              Entre com sua conta do GitHub para analisar repositórios e acompanhar suas submissões.
            </span>
            <Link href={`https://github.com/login/oauth/authorize?client_id=${Constants.ghCliendId}&redirect_uri=${encodeURIComponent(`http://localhost:3000/auth/github?next=${router.query.next ?? '/dashboard/datasets'}`)}`}>
              <a style={{ width: '100%' }}>
                <div className={styles.option}>
                  <FontAwesomeIcon icon={faGithub} className={styles.optionIcon} />
                  <span className={styles.optionLabel}>Entrar com o GitHub</span>
                </div>
              </a>
            </Link>
            <Link href='/'>
              <a className={styles.backHomeButton}>Voltar para o início</a>
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.auth}>
          <span className={styles.spinner} />
        </div>)
      }
    </>
  );
}