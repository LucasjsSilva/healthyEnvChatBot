import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import styles from '../styles/HowItWorks.module.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faChartLine, faScaleBalanced, faComments } from '@fortawesome/free-solid-svg-icons'

const steps = [
  {
    icon: faUpload,
    title: 'Você envia um repositório',
    description: 'Cole a URL de um repositório público do GitHub e escolha (ou crie) um dataset de destino para ele.',
  },
  {
    icon: faChartLine,
    title: 'Coleta de métricas',
    description: 'O HealthyEnv coleta cerca de 19 métricas de qualidade e saúde do repositório usando a API do GitHub.',
  },
  {
    icon: faScaleBalanced,
    title: 'Comparação com repositórios semelhantes',
    description: 'Uma redução de dimensionalidade (PCA) sobre indicadores como linhas de código, estrelas e contribuidores encontra, dentro do dataset, os repositórios mais parecidos para servir de referência na comparação.',
  },
  {
    icon: faComments,
    title: 'Insights em português',
    description: 'Um modelo de linguagem explica os resultados por categoria, e um assistente com busca em base de conhecimento (RAG) fica disponível para tirar dúvidas específicas sobre a análise.',
  },
]

const HowItWorks = () => {
  return (
    <>
      <Head>
        <title>HealthyEnv - Como funciona</title>
      </Head>
      <Header />

      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <Reveal>
            <span className={styles.badge}>Guia rápido</span>
            <h1 className={styles.heroTitle}>Como o HealthyEnv funciona</h1>
            <p className={styles.heroDesc}>
              Do envio de um repositório até os insights explicados em português, veja o caminho que sua análise percorre.
            </p>
          </Reveal>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.steps}>
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 100}>
                <div className={styles.stepCard}>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepNumber}>{i + 1}</span>
                    <span className={styles.stepIcon}>
                      <FontAwesomeIcon icon={step.icon} />
                    </span>
                  </div>
                  <div className={styles.stepBody}>
                    <h2 className={styles.stepTitle}>{step.title}</h2>
                    <p className={styles.stepDescription}>{step.description}</p>
                  </div>
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

export default HowItWorks
