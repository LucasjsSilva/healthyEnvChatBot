import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import styles from '../styles/DocsPage.module.css'

const concepts = [
  {
    term: 'Dataset',
    description: 'Um grupo de repositórios usado como referência de comparação. Cada repositório analisado é comparado com os demais do mesmo dataset.',
  },
  {
    term: 'Métrica',
    description: 'Um valor medido no repositório, como complexidade ciclomática, cobertura de testes ou número de contribuidores.',
  },
  {
    term: '"Quanto maior/menor, melhor"',
    description: 'Cada métrica tem uma direção própria: para algumas, valores mais altos são bons (ex.: cobertura de testes); para outras, valores mais baixos são bons (ex.: complexidade ciclomática).',
  },
  {
    term: 'Status OK / Razoável / Ruim',
    description: 'O valor do repositório é comparado com a mediana e os quartis dos repositórios de referência do dataset, respeitando a direção da métrica, para chegar nesse status.',
  },
  {
    term: 'Assistente com RAG',
    description: 'Um chat que responde perguntas sobre a análise combinando uma base de conhecimento própria com os resultados do repositório (Retrieval-Augmented Generation).',
  },
]

const DocsPage = () => {
  return (
    <>
      <Head>
        <title>HealthyEnv - Conceitos</title>
      </Head>
      <Header />

      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <Reveal>
            <span className={styles.badge}>Referência</span>
            <h1 className={styles.heroTitle}>Conceitos do HealthyEnv</h1>
            <p className={styles.heroDesc}>
              Os termos que aparecem nas suas análises, explicados em poucas palavras.
            </p>
          </Reveal>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.grid}>
            {concepts.map((concept, i) => (
              <Reveal key={concept.term} delay={i * 60}>
                <div className={styles.card}>
                  <h2 className={styles.term}>{concept.term}</h2>
                  <p className={styles.description}>{concept.description}</p>
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

export default DocsPage
