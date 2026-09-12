import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import { Dots } from 'react-activity'
import 'react-activity/dist/Dots.css'
import Head from 'next/head'
import Constants from '../../../utils/constants'
import Header from '../../../components/Header'
import styles from '../../../styles/RequestsByEmail.module.css'

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
      const resp = await axios.get(`${Constants.baseUrl}/me/repos`, { withCredentials: true })
      if (resp.status === 200) setRepos(resp.data || [])
    } catch (error) {
      console.error('Error loading GitHub repos:', error)
      setSubmitNotice({ type: 'error', text: 'Failed to load your GitHub repositories. Please try again.' })
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
      alert('Dataset name is required.')
      return
    }
    try {
      setIsCreatingDataset(true)
      const resp = await axios.post(
        `${Constants.baseUrl}/datasets`,
        { name: newDsName.trim(), description: newDsDesc.trim() },
        { withCredentials: true }
      )
      if (resp.status === 201) {
        setShowCreateModal(false)
        setNewDsName('')
        setNewDsDesc('')
        await loadDatasets()
        if (resp.data?.id) setSelectedDataset(resp.data.id)
      }
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error creating dataset')
    } finally {
      setIsCreatingDataset(false)
    }
  }

  async function submitRepository(repo: any) {
    if (!selectedDataset) {
      setSubmitNotice({ type: 'error', text: 'Please select a target dataset.' })
      return
    }
    try {
      const key = String(repo.full_name || repo.name || repo.svn_url || repo.html_url)
      setSubmitNotice(null)
      setSubmittingRepoKey(key)
      const repoUrl = repo.svn_url || repo.html_url
      const response = await axios.post(
        `${Constants.baseUrl}/datasets/${selectedDataset}/request_and_process`,
        { repo_url: repoUrl },
        { withCredentials: true }
      )
      if (response.status >= 200 && response.status < 300) {
        setSubmitNotice({ type: 'success', text: 'Repository submitted successfully! Processing has started.' })
        await loadGithubRepos()
      }
    } catch {
      setSubmitNotice({ type: 'error', text: 'Failed to submit repository. Please check your authentication and try again.' })
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
      <div className="flex items-center justify-center min-h-screen">
        <Dots color="#000000" size={32} speed={1} animating={true} />
      </div>
    )
  }

  return (
    <div className={styles.requestByEmail}>
      <Head>
        <title>Submit Repository | HealthyEnv</title>
      </Head>
      <Header />

      <div className={styles.info}>
        <span className={styles.title}>Submit Repository</span>
        <span className={styles.subtitle}>Submit a new repository for analysis</span>
        <span className={styles.description}>
          Select a dataset and choose a repository from your GitHub account to analyze.
        </span>

        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="dataset" className="block text-sm font-medium text-gray-700 mb-1">Dataset</label>
            <div className="flex gap-2">
              <select
                id="dataset"
                className="flex-1 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                disabled={isLoading || datasets.length === 0}
              >
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
                ))}
              </select>
              <button
                className="border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowCreateModal(true)}
              >
                + New
              </button>
            </div>
          </div>
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search repositories</label>
            <input
              type="text"
              id="search"
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {submitNotice && (
        <div className={`${styles.notice} ${submitNotice.type === 'success' ? styles.success : styles.error}`}>
          {submitNotice.text}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {isLoadingRepos ? (
          <div className="flex justify-center py-12"><Dots /></div>
        ) : filteredRepos.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredRepos.map((repo) => (
              <li key={repo.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-600 truncate">{repo.full_name}</p>
                    <p className="mt-1 text-sm text-gray-500 truncate">{repo.description || 'No description'}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none disabled:opacity-50"
                      onClick={() => submitRepository(repo)}
                      disabled={!!submittingRepoKey || !selectedDataset}
                    >
                      {submittingRepoKey === String(repo.full_name || repo.name) ? 'Submitting...' : 'Submit for Analysis'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <h3 className="mt-2 text-sm font-medium text-gray-900">No repositories found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? 'No repositories match your search criteria.'
                : 'You need to connect your GitHub account to see your repositories.'}
            </p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="mt-3 text-center sm:mt-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Create New Dataset</h3>
                <div className="mt-4">
                  <div className="mb-4">
                    <label htmlFor="dataset-name" className="block text-sm font-medium text-gray-700 text-left mb-1">Name *</label>
                    <input
                      type="text"
                      id="dataset-name"
                      className="block w-full sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Enter dataset name"
                      value={newDsName}
                      onChange={(e) => setNewDsName(e.target.value)}
                      disabled={isCreatingDataset}
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="dataset-desc" className="block text-sm font-medium text-gray-700 text-left mb-1">Description</label>
                    <textarea
                      id="dataset-desc"
                      rows={3}
                      className="block w-full sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Enter dataset description (optional)"
                      value={newDsDesc}
                      onChange={(e) => setNewDsDesc(e.target.value)}
                      disabled={isCreatingDataset}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 disabled:opacity-50 sm:col-start-2 sm:text-sm"
                  onClick={createDataset}
                  disabled={isCreatingDataset || !newDsName.trim()}
                >
                  {isCreatingDataset ? 'Creating...' : 'Create Dataset'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:col-start-1 sm:text-sm"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreatingDataset}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SubmitRepositoryPage
