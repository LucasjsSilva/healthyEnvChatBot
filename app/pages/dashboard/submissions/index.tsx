import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import RequestListItem from '../../../components/RequestListItem'
import Reveal from '../../../components/Reveal'
import Head from 'next/head'
import Constants from '../../../utils/constants'
import Header from '../../../components/Header'
import styles from '../../../styles/RequestsByEmail.module.css'

const SubmissionsPage = () => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [requests, setRequests] = useState<any[]>([])
  const [userData, setUserData] = useState<any | null>(null)
  const [datasets, setDatasets] = useState<any[]>([])
  const [selectedDataset, setSelectedDataset] = useState<string>('')
  const [datasetRepoCount, setDatasetRepoCount] = useState<number>(0)

  useEffect(() => {
    if (!router.isReady) return
    verifyAuth()
  }, [router.isReady])

  useEffect(() => {
    if (!userData) return
    loadDatasets()
    loadRequests()
  }, [userData])

  useEffect(() => {
    if (!selectedDataset) return
    loadDatasetRepoCount(selectedDataset)
  }, [selectedDataset])

  function verifyAuth() {
    let data: any = null
    try { data = JSON.parse(sessionStorage.getItem('userData') as any) } catch {}
    if (!data || (Date.now() - (data['timestamp'] || 0)) > 86400000) {
      router.push(`/auth?next=${router.asPath}`)
      return
    }
    setUserData(data)
  }

  async function loadRequests() {
    if (!userData?.email) return
    setIsLoading(true)
    try {
      const response = await axios.get(`${Constants.baseUrl}/requests/${userData.email}`)
      if (response.status === 200) setRequests(response.data['items'] || [])
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadDatasets() {
    try {
      const res = await axios.get(`${Constants.baseUrl}/datasets`)
      if (res.status === 200) {
        const items = res.data.items || []
        setDatasets(items)
        if (items.length > 0) setSelectedDataset(items[0].id)
      }
    } catch (error) {
      console.error('Error loading datasets:', error)
    }
  }

  async function loadDatasetRepoCount(datasetId: string) {
    try {
      const r = await axios.get(`${Constants.baseUrl}/datasets/${datasetId}/repos`)
      if (r.status === 200) {
        const total = Number(r.data.total_count ?? (r.data.items?.length ?? 0))
        setDatasetRepoCount(Number.isFinite(total) ? total : 0)
      }
    } catch (error) {
      console.error('Error loading dataset repo count:', error)
      setDatasetRepoCount(0)
    }
  }

  const visibleRequests = useMemo(() => {
    if (!selectedDataset) return []
    return (requests || []).filter((req: any) =>
      String(req.dataset_id || '') === String(selectedDataset)
    )
  }, [requests, selectedDataset])

  return (
    <>
      <Head>
        <title>HealthyEnv - Minhas submissões</title>
      </Head>
      <Header />
      <div className={styles.container}>
        <div className={styles.infoTop}>
          <span className={styles.title}>Minhas submissões</span>
          <span className={styles.subtitle}>Acompanhe o status dos repositórios que você enviou para análise</span>

          {datasets.length > 0 && (
            <div className={styles.controlsRow}>
              <div className={styles.fieldGroup}>
                <label htmlFor="dataset-filter" className={styles.labels}>Dataset</label>
                <select
                  id="dataset-filter"
                  className={styles.inputs}
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className={styles.loadingInline}>
            <span className={styles.spinner} />
            <span className={styles.loadingText}>Carregando submissões...</span>
          </div>
        ) : visibleRequests.length > 0 ? (
          <div className={styles.list}>
            {visibleRequests.map((request: any, index: number) => {
              const isDone = String(request['status']).toUpperCase() === 'DONE'
              const repoUrl: string = request['repo_url'] || ''
              const parts = repoUrl.split('/').filter(Boolean)
              const repo = parts[parts.length - 1]
              const owner = parts[parts.length - 2]

              return (
                <Reveal key={request.id} delay={Math.min(index, 8) * 40}>
                  <RequestListItem
                    name={request['name']}
                    email={request['email']}
                    url={repoUrl}
                    status={request['status']}
                    action={
                      isDone && selectedDataset && owner && repo ? (
                        datasetRepoCount >= 10 ? (
                          <a
                            href={`/dashboard/datasets/${encodeURIComponent(String(selectedDataset))}/analyze/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}?near=10`}
                            className={styles.viewMetricsButton}
                          >
                            Ver métricas
                          </a>
                        ) : (
                          <span
                            className={styles.viewMetricsDisabled}
                            title={`Dataset muito pequeno (${datasetRepoCount}/10). Adicione mais repositórios para ver as métricas.`}
                          >
                            Ver métricas
                          </span>
                        )
                      ) : null
                    }
                  />
                </Reveal>
              )
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Nenhuma submissão encontrada</div>
            <div className={styles.emptyDescription}>
              Você ainda não enviou nenhum repositório para análise.
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default SubmissionsPage
