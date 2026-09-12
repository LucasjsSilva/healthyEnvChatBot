import Header from '../components/Header'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import styles from '../styles/Home.module.css'
import Link from 'next/link'
import Head from 'next/head'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight, faDatabase, faChartLine, faComments } from '@fortawesome/free-solid-svg-icons'

const steps = [
  {
    icon: faDatabase,
    title: '1. Escolha um dataset',
    description: 'Selecione um conjunto de repositórios de referência para comparar o seu projeto.',
  },
  {
    icon: faChartLine,
    title: '2. Compare métricas',
    description: 'Veja como seu repositório se posiciona em cerca de 19 métricas de saúde, como atividade de issues, tempo de resposta e fator caminhão.',
  },
  {
    icon: faComments,
    title: '3. Entenda os resultados',
    description: 'Converse com o chatbot para entender, em português claro, o que cada métrica significa e como melhorar.',
  },
]

const stats = [
  { value: '~19', label: 'métricas de saúde analisadas' },
  { value: '100%', label: 'gratuito e de código aberto' },
  { value: 'IA', label: 'chatbot explica os resultados' },
]

export default function Home() {
  const image = '/assets/landing.png'

  return (
    <>
      <Head>
        <title>HealthyEnv - Ferramenta para avaliação de repositórios de software</title>
      </Head>
      <Header />
      <div className={styles.container}>
        <div className={styles.firstSection}>
          <div className={styles.imageContainer}>
            <Image src={image} layout='fill' objectFit='contain' alt='Exemplo de análise de métricas.' className={styles.image} quality='100' />
          </div>
          <div className={styles.presentation}>
            <span className={styles.title}>
              Avalie a saúde do seu repositório em minutos
            </span>
            <span className={styles.subtitle}>
              O HealthyEnv compara seu projeto open source com centenas de repositórios reais
              e explica os resultados em linguagem simples, com a ajuda de um chatbot inteligente.
            </span>
            <div className={styles.linksList}>
              <div>
                <Link href='/dashboard/datasets'>
                  <a className={styles.button}>
                    Explorar o dataset
                    <FontAwesomeIcon icon={faChevronRight} />
                  </a>
                </Link>
              </div>
              <div>
                <a href='#como-funciona' className={styles.simpleButton}>
                  Ver como funciona
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.statsSection}>
        <div className={styles.statsContent}>
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 80}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div id='como-funciona' className={styles.stepsSection}>
        <div className={styles.stepsContent}>
          <Reveal>
            <h2 className={styles.stepsTitle}>Como funciona</h2>
            <p className={styles.stepsSubtitle}>
              Do repositório à recomendação, em três passos simples.
            </p>
          </Reveal>
          <div className={styles.stepsGrid}>
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 120}>
                <div className={styles.stepCard}>
                  <div className={styles.stepIcon}>
                    <FontAwesomeIcon icon={step.icon} />
                  </div>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <span className={styles.stepDescription}>{step.description}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}
