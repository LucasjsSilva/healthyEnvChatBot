import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Head from 'next/head'
import Constants from '../../../utils/constants'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Reveal from '../../../components/Reveal'
import SkeletonRepoList from '../../../components/SkeletonRepoList'
import styles from '../../../styles/RequestsByEmail.module.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faPlus } from '@fortawesome/free-solid-svg-icons'

const SubmitRepositoryPage = () => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<any | null>(null)
  const [repos, setRepos] = useState<any[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [submittingRepoKey, setSubmittingRepoKey] = useState('')
  const [submitNotice, setSubmitNotice] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [datasets, setDatasets] = useState<any[]>([])
  const [selectedDataset, setSelectedDataset] = useState('')
  const [isCreatingDataset, setIsCreatingDataset] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newDsName, setNewDsName] = useState('')
  const [newDsDesc, setNewDsDesc] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!router.isReady) return
    verifyAuth()
  }, [router.isReady])

  useEffect(() => {
    if (!userData) return
    loadDatasets()
    loadGithubRepos()
  }, [userData])

  useEffect(() => {
    if (!selectedDataset || !repos.length) return
    filterRepos()
  }, [selectedDataset, repos, searchTerm])

  function verifyAuth() {
    let data: any = null
    try { data = JSON.parse(sessionStorage.getItem('userData') as any) } catch {}
    if (!data || (Date.now() - (data['timestamp'] || 0)) > 86400000) {
      router.push(`/auth?next=${router.asPath}`)
      return
    }
    setUserData(data)
    setIsLoading(false)
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

  async function loadGithubRepos() {
    setIsLoadingRepos(true)
    try {
      const resp = await axios.get(`https://api.github.com/user/repos`, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `token ${userData['token']}`,
        },
        params: { per_page: 100, sort: 'updated' },
      })
      if (resp.status === 200) setRepos(resp.data || [])
    } catch (error) {
      console.error('Error loading GitHub repos:', error)
      setSubmitNotice({ type: 'error', text: 'Não foi possível carregar seus repositórios do GitHub. Tente novamente.' })
    } finally {
      setIsLoadingRepos(false)
    }
  }

  async function filterRepos() {
    if (!selectedDataset) return
    try {
      const response = await axios.get(`${Constants.baseUrl}/datasets/${selectedDataset}/repos`)
      const existingRepos = new Set(
        (response.data.items || []).map((r: any) => r.name?.toLowerCase())
      )
      const filtered = repos.filter((repo) => {
        const isSubmitted = [repo.full_name, repo.name, repo.svn_url, repo.html_url]
          .filter(Boolean)
          .some((val: any) => existingRepos.has(String(val).toLowerCase()))
        const matchesSearch = [repo.full_name, repo.name, repo.description]
          .filter(Boolean)
          .some((val: any) => val.toLowerCase().includes(searchTerm.toLowerCase()))
        return !isSubmitted && (searchTerm ? matchesSearch : true)
      })
      setRepos(filtered)
    } catch (error) {
      console.error('Error filtering repositories:', error)
    }
  }

  async function createDataset() {
    if (!newDsName.trim()) {
      alert('O nome do dataset é obrigatório.')
      return
    }
    try {
      setIsCreatingDataset(true)
      const resp = await axios.post(
        `${Constants.baseUrl}/datasets`,
        { name: newDsName.trim(), description: newDsDesc.trim(), author: userData['login'] }
      )
      if (resp.status === 201) {
        setShowCreateModal(false)
        setNewDsName('')
        setNewDsDesc('')
        await loadDatasets()
        if (resp.data?.id) setSelectedDataset(resp.data.id)
      }
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Erro ao criar o dataset.')
    } finally {
      setIsCreatingDataset(false)
    }
  }

  async function submitRepository(repo: any) {
    if (!selectedDataset) {
      setSubmitNotice({ type: 'error', text: 'Selecione um dataset de destino.' })
      return
    }
    try {
      const key = String(repo.full_name || repo.name || repo.svn_url || repo.html_url)
      setSubmitNotice(null)
      setSubmittingRepoKey(key)
      const repoUrl = repo.svn_url || repo.html_url
      const email = userData['email'] || userData['login']
      const response = await axios.post(
        `${Constants.baseUrl}/datasets/${selectedDataset}/request`,
        {
          name: userData['login'],
          email,
          repo_url: repoUrl,
          gh_token: userData['token'],
        }
      )
      if (response.status >= 200 && response.status < 300) {
        setSubmitNotice({ type: 'success', text: 'Repositório enviado com sucesso! O processamento foi iniciado.' })
        await loadGithubRepos()
      }
    } catch {
      setSubmitNotice({ type: 'error', text: 'Falha ao enviar o repositório. Verifique sua autenticação e tente novamente.' })
    } finally {
      setSubmittingRepoKey('')
    }
  }

  const filteredRepos = useMemo(() => {
    if (!searchTerm) return repos
    return repos.filter((repo) =>
      [repo.full_name, repo.name, repo.description]
        .filter(Boolean)
        .some((val: any) => val.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [repos, searchTerm])

  if (isLoading) {
    return (
      <>
        <Header />
        <div className={styles.loadingInline} style={{ height: '70vh' }}>
          <span className={styles.spinner} />
          <span className={styles.loadingText}>Carregando...</span>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Head>
        <title>HealthyEnv - Enviar repositório</title>
      </Head>
      <Header />
      <div className={styles.container}>
        <div className={styles.infoTop}>
          <span className={styles.title}>Enviar repositório</span>
          <span className={styles.subtitle}>Envie um novo repositório para análise</span>
          <span className={styles.description}>
            Escolha um dataset de destino e selecione um repositório da sua conta do GitHub para analisar.
          </span>

          <div className={styles.controlsRow}>
            <div className={styles.fieldGroup}>
              <label htmlFor="dataset" className={styles.labels}>Dataset</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  id="dataset"
                  className={styles.inputs}
                  style={{ flex: 1 }}
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  disabled={datasets.length === 0}
                >
                  {datasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.newDatasetButton}
                  onClick={() => setShowCreateModal(true)}
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Novo
                </button>
              </div>
            </div>
            <div className={`${styles.fieldGroup} ${styles.searchGroup}`}>
              <label htmlFor="search" className={styles.labels}>Buscar repositórios</label>
              <div className={styles.searchWrapper}>
                <FontAwesomeIcon icon={faMagnifyingGlass} className={styles.searchIcon} />
                <input
                  type="text"
                  id="search"
                  className={styles.searchInput}
                  placeholder="Buscar repositórios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {submitNotice && (
          <div className={`${styles.notice} ${submitNotice.type === 'success' ? styles.success : styles.error}`}>
            {submitNotice.text}
          </div>
        )}

        {isLoadingRepos ? (
          <SkeletonRepoList count={6} />
        ) : filteredRepos.length > 0 ? (
          <div className={styles.list}>
            {filteredRepos.map((repo, index) => {
              const key = String(repo.full_name || repo.name)
              return (
                <Reveal key={repo.id} delay={Math.min(index, 8) * 40}>
                  <div className={styles.repoCard}>
                    <div className={styles.repoInfo}>
                      <span className={styles.repoName}>{repo.full_name}</span>
                      <span className={styles.repoDescription}>{repo.description || 'Sem descrição'}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.submitButton}
                      onClick={() => submitRepository(repo)}
                      disabled={!!submittingRepoKey || !selectedDataset}
                    >
                      {submittingRepoKey === key ? 'Enviando...' : 'Enviar para análise'}
                    </button>
                  </div>
                </Reveal>
              )
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Nenhum repositório encontrado</div>
            <div className={styles.emptyDescription}>
              {searchTerm
                ? 'Nenhum repositório corresponde à sua busca.'
                : 'Conecte sua conta do GitHub para ver seus repositórios.'}
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <span className={styles.modalTitle}>Criar novo dataset</span>
            <div className={styles.modalField}>
              <label htmlFor="dataset-name" className={styles.labels}>Nome *</label>
              <input
                type="text"
                id="dataset-name"
                className={styles.modalInput}
                placeholder="Digite o nome do dataset"
                value={newDsName}
                onChange={(e) => setNewDsName(e.target.value)}
                disabled={isCreatingDataset}
              />
            </div>
            <div className={styles.modalField}>
              <label htmlFor="dataset-desc" className={styles.labels}>Descrição</label>
              <textarea
                id="dataset-desc"
                rows={3}
                className={styles.modalTextarea}
                placeholder="Digite a descrição do dataset (opcional)"
                value={newDsDesc}
                onChange={(e) => setNewDsDesc(e.target.value)}
                disabled={isCreatingDataset}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalSecondaryButton}
                onClick={() => setShowCreateModal(false)}
                disabled={isCreatingDataset}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalPrimaryButton}
                onClick={createDataset}
                disabled={isCreatingDataset || !newDsName.trim()}
              >
                {isCreatingDataset ? 'Criando...' : 'Criar dataset'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </>
  )
}

export default SubmitRepositoryPage
