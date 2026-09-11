import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import styles from '../../../styles/Datasets.module.css'
import RepoListItem from '../../../components/RepoListItem'
import SkeletonRepoList from '../../../components/SkeletonRepoList'
import Reveal from '../../../components/Reveal'
import Head from 'next/head'
import Constants from '../../../utils/constants'
import Header from '../../../components/Header'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'

const Datasets = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true)
  const [repos, setRepos] = useState([])
  const [displayingRepos, setDisplayingRepos] = useState([])
  const [datasetsOptions, setDatasetsOptions] = useState([])
  const [selectedDataset, setSelectedDataset] = useState()
  const [nValue, setNValue] = useState(1)

  const datasetsIdListRef = useRef<string[]>([])

  useEffect(() => {
    loadDatasets().then(() => loadRepos(datasetsIdListRef.current[0]))
  }, [])

  async function loadDatasets() {
    setIsLoadingDatasets(true)
    const response = await axios.get(`${Constants.baseUrl}/datasets`)
    const optionList = []
    datasetsIdListRef.current = []

    response.data.items.forEach((dataset: object, index: number) => {
      datasetsIdListRef.current.push(dataset['id'])
      optionList.push(
        <option value={index} key={dataset['id']}>
          {Buffer.from(dataset['name'], 'utf-8').toString()}
        </option>
      )
    })

    setSelectedDataset(datasetsIdListRef.current[0])
    setDatasetsOptions([...optionList])
    setIsLoadingDatasets(false)
  }

  const getNValue = () => {
    return nValue
  }

  async function loadRepos(dataset_id: string) {
    setIsLoading(true)
    const response = await axios.get(`${Constants.baseUrl}/datasets/${dataset_id}/repos`)

    setNValue(Math.round(response.data['total_count'] / 10))
    setRepos(response.data.items)
    setDisplayingRepos(response.data.items)
    setIsLoading(false)
  }

  return (
    <>
      <Head>
        <title>HealthyEnv - Datasets e análise</title>
      </Head>
      <Header />
      <div className={styles.container}>
        <div className={styles.infoTop}>
          <span className={styles.title}>
            Análise de repositórios
          </span>
          <span className={styles.subtitle}>
            Avalie a saúde de um repositório com base em projetos semelhantes
          </span>
          <span className={styles.description}>
            Usando um método inspirado em algoritmos de Machine Learning não supervisionado, o
            HealthyEnv encontra um grupo de repositórios semelhantes ao selecionado para análise
            e mostra como as métricas dele se comparam aos valores de referência formados pelas
            métricas desses repositórios semelhantes.
          </span>

          {!isLoadingDatasets
            ? <div className={styles['repo-list-top']}>
              <div className={styles.fieldGroup}>
                <label htmlFor='dataset' className={styles.labels}>Dataset</label>
                <select
                  className={styles.inputs}
                  id='dataset'
                  onChange={(e) => {
                    const datasetId = datasetsIdListRef.current[Number(e.target.value)]
                    setSelectedDataset(datasetId)
                    loadRepos(datasetId)
                  }}
                >
                  {datasetsOptions}
                </select>
              </div>
              <div className={`${styles.fieldGroup} ${styles.searchGroup}`}>
                <label htmlFor='search' className={styles.labels}>Filtrar</label>
                <div className={styles.searchWrapper}>
                  <FontAwesomeIcon icon={faMagnifyingGlass} className={styles.searchIcon} />
                  <input
                    type='text'
                    id='search'
                    placeholder='Filtrar repositórios'
                    className={styles.searchInput}
                    onChange={(e) => {
                      setDisplayingRepos(
                        repos.filter((repo) => repo['name'].toLowerCase().includes(e.target.value.toLowerCase()))
                      )
                    }} />
                </div>
              </div>
            </div>
            : (
              <div className={styles.loadingInline}>
                <span className={styles.spinner} />
                <span className={styles.loadingText}>Carregando datasets...</span>
              </div>
            )
          }
        </div>
        {!isLoading
          ? <div className={styles['repo-list']}>
            {displayingRepos.map((repo, index) => (
              <Reveal key={repo['id']} delay={Math.min(index, 8) * 40}>
                <RepoListItem repo={repo} datasetId={selectedDataset} getNValue={getNValue} />
              </Reveal>
            ))}
          </div>
          : <SkeletonRepoList count={6} />
        }
      </div>
    </>
  )
}

export default Datasets
