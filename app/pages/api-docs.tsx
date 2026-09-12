import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import styles from '../styles/ApiDocs.module.css'

interface Endpoint {
  method: 'GET' | 'POST'
  path: string
  description: string
  params?: string
  example: string
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/datasets',
    description: 'Lista todos os datasets cadastrados.',
    example: `{
  "total_count": 1,
  "items": [
    { "id": "ab12cd34ef", "name": "Frontend frameworks", "description": "...", "repo_count": 24, "author": "lucas" }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/datasets',
    description: 'Cria um novo dataset.',
    params: 'Corpo: name (obrigatório), description, author',
    example: `{
  "id": "gh56ij78kl",
  "name": "Bibliotecas de gráficos",
  "description": "",
  "repo_count": 0,
  "author": "lucas"
}`,
  },
  {
    method: 'POST',
    path: '/datasets/:id/request',
    description: 'Envia um repositório para análise dentro de um dataset. Inicia o processamento em segundo plano.',
    params: 'Corpo: name, email, repo_url, gh_token (opcional)',
    example: `{
  "mn90op12qr": {
    "id_dataset": "ab12cd34ef",
    "name": "lucas",
    "email": "lucas@email.com",
    "repo_url": "https://github.com/user/repo",
    "status": "RECEIVED"
  }
}`,
  },
  {
    method: 'GET',
    path: '/requests/:email',
    description: 'Lista as submissões de análise feitas por um e-mail (ou nome), com o status atual de cada uma.',
    example: `{
  "total_count": 1,
  "items": [
    { "id": "mn90op12qr", "dataset_id": "ab12cd34ef", "name": "lucas", "email": "lucas@email.com", "repo_url": "https://github.com/user/repo", "status": "DONE" }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/datasets/:id/repos',
    description: 'Lista os repositórios já processados dentro de um dataset.',
    example: `{
  "total_count": 1,
  "items": [
    { "id": 1, "name": "user/repo", "language": "TypeScript", "loc": 15234, "stars": 320, "forks": 42, "open_issues": 8, "contributors": 15, "commits": 812 }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/datasets/:id/cluster/:repo',
    description: 'Retorna o repositório selecionado e os repositórios mais semelhantes a ele dentro do dataset, com os valores de métrica de cada um.',
    params: 'Query: near_n (quantidade de repositórios semelhantes a retornar)',
    example: `{
  "selected": { "id": 1, "name": "user/repo", "metrics": { "st34uv56wx": 3.2 } },
  "repos": [
    { "id": 2, "name": "user/other-repo", "near": true, "metrics": { "st34uv56wx": 2.8 } }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/metrics',
    description: 'Lista as métricas disponíveis no sistema: nome, descrição e se valores maiores são melhores (is_upper).',
    example: `{
  "total_count": 1,
  "items": [
    { "id": "st34uv56wx", "name": "Complexidade ciclomática", "description": "...", "is_upper": false, "category_id": "cat01" }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/metrics/categories',
    description: 'Lista as categorias em que as métricas são agrupadas.',
    example: `{
  "total_count": 1,
  "items": [
    { "id": "cat01", "working_group": "Manutenibilidade", "description": "..." }
  ]
}`,
  },
]

const methodClass = (method: string) => (method === 'POST' ? styles.methodPost : styles.methodGet)

const ApiDocs = () => {
  return (
    <>
      <Head>
        <title>HealthyEnv - Referência da API</title>
      </Head>
      <Header />

      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <Reveal>
            <span className={styles.badge}>Para desenvolvedores</span>
            <h1 className={styles.heroTitle}>Referência da API</h1>
            <p className={styles.heroDesc}>
              Os endpoints públicos do HealthyEnv, para quem quiser consumir os dados de análises e datasets diretamente.
            </p>
          </Reveal>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionContent}>
          <div className={styles.list}>
            {endpoints.map((endpoint, i) => (
              <Reveal key={`${endpoint.method}-${endpoint.path}`} delay={i * 50}>
                <div className={styles.endpointCard}>
                  <div className={styles.endpointHeader}>
                    <span className={`${styles.method} ${methodClass(endpoint.method)}`}>{endpoint.method}</span>
                    <code className={styles.path}>{endpoint.path}</code>
                  </div>
                  <p className={styles.description}>{endpoint.description}</p>
                  {endpoint.params && <p className={styles.params}>{endpoint.params}</p>}
                  <pre className={styles.example}>{endpoint.example}</pre>
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

export default ApiDocs
