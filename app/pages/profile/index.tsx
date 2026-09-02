import { useEffect, useState } from 'react'
import Head from 'next/head'
import Router from 'next/router'
import axios from 'axios'
import Constants from '../../utils/constants'
import Header from '../../components/Header'
import DatasetPicker from '../../components/DatasetPicker'

interface Repo {
  id: number
  full_name: string
  html_url: string
  description?: string
  private: boolean
  fork: boolean
}

export default function ProfilePage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [datasetModalRepo, setDatasetModalRepo] = useState<Repo | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  useEffect(() => {
    try {
      const data = sessionStorage.getItem('userData')
      if (!data) {
        Router.push('/auth?next=/profile')
        return
      }
    } catch {
      Router.push('/auth?next=/profile')
      return
    }

    const fetchRepos = async () => {
      try {
        const resp = await axios.get(`${Constants.baseUrl}/me/repos`, { withCredentials: true })
        setRepos(resp.data || [])
      } catch {
        setError('Falha ao carregar repositórios. Faça login novamente.')
      } finally {
        setLoading(false)
      }
    }

    fetchRepos()
  }, [])

  const onDatasetPicked = async (datasetId: string) => {
    if (!datasetModalRepo) return
    setSubmitting(true)
    setResultMsg(null)
    try {
      const resp = await axios.post(
        `${Constants.baseUrl}/datasets/${datasetId}/request_and_process`,
        { repo_url: datasetModalRepo.html_url },
        { withCredentials: true }
      )
      setResultMsg(`Submetido com sucesso: status ${resp.data?.status || 'DONE'}`)
    } catch {
      setResultMsg('Erro ao submeter/processar o repositório.')
    } finally {
      setSubmitting(false)
      setDatasetModalRepo(null)
    }
  }

  return (
    <>
      <Head>
        <title>Meu Perfil - HealthyEnv</title>
      </Head>
      <Header />
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: 16 }}>
        <h1 className="text-2xl font-semibold mb-4">Meus repositórios</h1>
        {loading && <div>Carregando...</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && (
          <div style={{ display: 'grid', gap: 12 }}>
            {repos.map((r) => (
              <div key={r.id} className="border rounded-md p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-sm opacity-80">{r.description || ''}</div>
                </div>
                <button
                  className="bg-emerald-600 text-white px-3 py-1 rounded"
                  onClick={() => setDatasetModalRepo(r)}
                >
                  Analisar
                </button>
              </div>
            ))}
          </div>
        )}

        {resultMsg && <div className="mt-4 text-sm">{resultMsg}</div>}
        {submitting && <div className="mt-2 text-sm text-gray-500">Processando...</div>}
      </div>

      <DatasetPicker
        open={!!datasetModalRepo}
        onClose={() => setDatasetModalRepo(null)}
        onPicked={onDatasetPicked}
      />
    </>
  )
}
