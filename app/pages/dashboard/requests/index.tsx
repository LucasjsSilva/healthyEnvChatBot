import axios from "axios";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardHeader from "../../../components/DashboardHeader";
import Header from "../../../components/Header";
import styles from '../../../styles/Request.module.css'
import Constants from "../../../utils/constants";
import Router, { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

const Requests = () => {
  const router = useRouter()
  const [datasetsOptions, setDatasetsOptions] = useState([])
  const [selectedDataset, setSelectedDataset] = useState()
  const datasetsIdList = []


  const [isLoadingRepositories, setIsLoadingRepositories] = useState(true)
  const [userData, setUserData] = useState({})
  const [repositories, setRepositories] = useState([])

  const [loadError, setLoadError] = useState('')

  async function loadRepositories() {
    if (typeof window === "undefined") return
    try {
      const raw = sessionStorage.getItem('userData')
      if (!raw) {
        setLoadError('Usuário não autenticado. Faça login novamente.')
        return
      }
      const parsed = JSON.parse(raw)
      if (!parsed.email) parsed.email = parsed.login
      setUserData(parsed)

      if (!parsed.token) {
        setLoadError('Token inválido. Faça logout e login novamente.')
        return
      }

      const response = await axios.get(`https://api.github.com/user/repos`, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `token ${parsed.token}`,
        },
        params: { per_page: 100, sort: 'updated' },
      })

      if (response.status === 200) {
        setRepositories(response.data)
      }
    } catch (e: any) {
      console.error('Failed to load repositories:', e)
      const status = e?.response?.status
      if (status === 401) {
        setLoadError('Sessão expirada. Faça logout e login novamente.')
      } else {
        setLoadError(`Erro ao carregar repositórios (${status ?? e?.message}).`)
      }
    } finally {
      setIsLoadingRepositories(false)
    }
  }

  useEffect(() => {
    verifyAuth()
    loadDatasets()
    loadRepositories()
  }, [])

  function verifyAuth() {
    const data = JSON.parse(sessionStorage.getItem('userData'))

    if (data == undefined) {
      Router.push(`/auth?next=${router.asPath}`)
    } else {
      if ((Date.now() - data['timestamp']) > 86400000) {
        Router.push(`/auth?next=${router.asPath}`)
      }
    }
  }

  async function loadDatasets() {
    const response = await axios.get(`${Constants.baseUrl}/datasets`)
    const optionList = []
    response.data.items.forEach((dataset) => {
      datasetsIdList.push(dataset.id)
      optionList.push(
        <option value={dataset.id} key={dataset.id}>
          {Buffer.from(dataset['name'], 'utf-8').toString()}
        </option>
      )
    })
    setSelectedDataset(datasetsIdList[0])
    setDatasetsOptions([...optionList])
  }

  async function submitRequest(username, email, repo) {
    const response = await axios.post(
      `${Constants.baseUrl}/datasets/${selectedDataset}/request`, {
      name: username,
      email: email,
      repo_url: repo,
      gh_token: userData['token'],
    }
    )
    if (response.status >= 200) {
    } else {
      alert('Algo deu errado. Verifique os dados digitados e tente novamente.')
    }
  }

  function renederSkeletonLoader() {
    const skeletonItemList = []
    for (var i = 0; i < 30; i++) {
      skeletonItemList.push(
        <div className="bg-white h-[45px] rounded-md animate-pulse mb-2" key={`skeleton_${i}`} />
      )
    }

    return skeletonItemList
  }

  function renderRepositories() {
    const repoItemList = []
    repositories.forEach((repository, index) => {
      repoItemList.push(
        <div className="bg-white h-[45px] rounded-md mb-2 px-4 py-2 flex flex-row items-center justify-between cursor-pointer hover:shadow-md" key={`repo_${index}`} onClick={() => {
          const email = userData['email'] || userData['login']
          submitRequest(userData['login'], email, repository['svn_url']).then(() => {
            router.push(`/dashboard/requests/${email}`)
          })
        }} >
          <span className="text-lg">{repository['name']}</span>
          <FontAwesomeIcon icon={faChevronRight} />
        </div>
      )
    })

    return repoItemList
  }

  return (
    <>
      <Head>
        <title>HealthyEnv - Solicitar inclusão de repositório</title>
      </Head>
      <DashboardHeader selectedIndex={2} />
      <div className="bg-[#f0f1f3] h-full p-[16px] w-[1280px] ml-auto mr-auto">
        <div className="flex flex-col px-4 pt-6 pb-4 mb-4 bg-white rounded-md">
          <span className="mb-3 text-3xl font-bold">Repository submission</span>
          <span>Select a repository to perform an analysis and contribute to HealthyEnv dataset.</span>
        </div>
        {isLoadingRepositories ? (
          <div>
            {renederSkeletonLoader()}
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-md px-4 py-3 text-red-600">
            {loadError}
          </div>
        ) : (
          <div>
            {renderRepositories()}
          </div>
        )}
      </div>
    </>
  );
}

export default Requests;