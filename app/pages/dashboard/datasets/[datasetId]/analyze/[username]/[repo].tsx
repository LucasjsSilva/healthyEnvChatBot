import axios from "axios"
import Popup from "reactjs-popup"
import Head from "next/head"
import Constants from "../../../../../../utils/constants"
import styles from '../../../../../../styles/AnalyzeRepo.module.css'
import Router, { useRouter } from "next/router"
import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowRightArrowLeft, faArrowsRotate, faCheck } from "@fortawesome/free-solid-svg-icons"
import { getFirstQuartile, getMedian, getThirdQuartile } from "../../../../../../functions/stats"
import PlotGrid from "../../../../../../components/PlotGrid"
import Header from "../../../../../../components/Header"
import RepoInfos from "../../../../../../components/RepoInfos"
import NearReposPlot from "../../../../../../components/NearReposPlot"
import MetricsHint from "../../../../../../components/MetricsHint"
import AnalysisSummarySection from "../../../../../../components/AnalysisSummarySection"
import ChangeRepoModal from "../../../../../../components/ChangeRepoModal"
import ChangeNModal from "../../../../../../components/ChangeNModal"
import ChatBot from "../../../../../../components/ChatBot"
import InsightCard from "../../../../../../components/InsightCard"

enum MetricSituation {
  Ok = 'OK',
  Reasonable = 'REASONABLE',
  Bad = 'BAD',
}

const Repo = () => {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [selectedRepoInfo, setSelectedRepoInfo] = useState({})
  const [referenceReposInfo, setReferenceReposInfo] = useState([])
  const [metricsData, setMetricsData] = useState([])
  const [requestPayloads, setRequestPayloads] = useState([])
  const [analysisSummary, setAnalysisSummary] = useState({})
  const [nValue, setNValue] = useState(1)
  const [insights, setInsights] = useState<any>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)

  // Modal
  const [open, setOpen] = useState(false)
  const closeModalRepo = () => setOpen(false)
  const [openN, setOpenN] = useState(false)
  const closeModalN = () => setOpenN(false)

  useEffect(() => {
    if (!router.isReady) return
    // verifyAuth()
    loadRepo(router.query.datasetId, `${router.query.username}/${router.query.repo}`, +router.query.near)
  }, [router.isReady])

  // function verifyAuth() {
  //   const data = JSON.parse(localStorage.getItem('userData'))

  //   if (data == undefined) {
  //     Router.push(`/auth?next=${router.asPath}`)
  //   } else {
  //     if ((Date.now() - data['timestamp']) > 86400000) {
  //       Router.push(`/auth?next=${router.asPath}`)
  //     }
  //   }
  // }

  // Fetches and stores AI-generated insights for the current repo analysis
  async function loadInsights(repoInfo: any, metricsData: any[], allRepos: any[]) {
    if (!repoInfo || !metricsData.length) return
    setInsights(null)
    setInsightsLoading(true)

    const similarRepos = allRepos.filter((r: any) => r.near).map((r: any) => r.name)

    const payload = {
      repo: {
        name: repoInfo.name,
        language: repoInfo.language,
        loc: repoInfo.loc,
        stars: repoInfo.stars,
        forks: repoInfo.forks,
        open_issues: repoInfo.open_issues,
        contributors: repoInfo.contributors,
        commits: repoInfo.commits,
      },
      metrics_by_category: metricsData.map((cat: any) => ({
        id: cat.id,
        working_group: cat.working_group,
        metrics: cat.metrics.map((m: any) => {
          const refValues = m.values.reference.map((r: any) => r.value).filter((v: any) => v != null && !isNaN(v))
          const median = refValues.length > 0 ? getMedian(refValues) : null
          const selected = m.values.selected.value ?? 0
          const diff_pct = (median != null && median !== 0 && selected != null)
            ? Math.round(((selected - median) / median) * 100)
            : null
          return {
            id: m.id,
            name: m.name,
            value: selected,
            situation: m.situation,
            median_reference: median,
            diff_pct,
          }
        }),
      })),
      cluster: {
        similar_repos: similarRepos,
        total_repos_in_dataset: allRepos.length + 1,
      },
    }

    try {
      const res = await axios.post(`${Constants.baseUrl}/insights`, payload)
      setInsights(res.data)
    } catch (e) {
      console.error('Failed to load insights', e)
    } finally {
      setInsightsLoading(false)
    }
  }

  // Load a repo's analysis
  async function loadRepo(datasetId: string | string[], repoName: string | string[], n: number) {
    setIsLoading(true)
    setInsights(null)

    // API URLs
    const urlResults = `${Constants.baseUrl}/datasets/${datasetId}/cluster/${repoName}?near_n=${n}`
    const urlMetricsInfo = `${Constants.baseUrl}/metrics`
    const urlMetricsCategories = `${Constants.baseUrl}/metrics/categories`

    // Make all requests and update states with the received data
    await Promise.all([axios.get(urlResults), axios.get(urlMetricsInfo), axios.get(urlMetricsCategories)]).then((values) => {
      const resultsResponse = values[0].data
      const metricsInfoResponse = values[1].data
      const metricsCategoriesResponse = values[2].data

      setSelectedRepoInfo(resultsResponse['selected'])
      setReferenceReposInfo(resultsResponse['repos'])
      setRequestPayloads([{
        url: urlResults,
        payload: JSON.stringify(resultsResponse, null, 2)
      }])

      // Make an list with all necessary data to perform an analysis
      const metricsData = []
      let okMetricsCount = 0, reasonableMetricsCount = 0, badMetricsCount = 0

      metricsCategoriesResponse.items.forEach(category => {
        const metricInfo = []

        metricsInfoResponse.items.forEach(metric => {
          if (category.id === metric['category_id']) {
            const refMetricsValues = [], valuesArray = []
            const selected = {
              name: resultsResponse['selected']['name'],
              value: resultsResponse['selected']['metrics'][metric['id']]
            }
            resultsResponse['repos'].forEach((repo: any) => {
              if (repo.near) {
                const metricValue = repo.metrics[metric['id']]
                refMetricsValues.push({
                  name: repo.name,
                  value: metricValue
                })
                if (metricValue != null && !isNaN(metricValue)) {
                  valuesArray.push(metricValue)
                }
              }
            })

            const median = getMedian(valuesArray)
            const firstQuartile = getFirstQuartile(valuesArray)
            const thirdQuartile = getThirdQuartile(valuesArray)
            // TODO: const { median, firstQuartile, thirdQuartile } = funcaoQueRetornaTodosNumObjecto(valuesArray);

            let metricSituation: MetricSituation
            if ((resultsResponse.selected['metrics'][metric['id']] > median ? true : false) == metric['is_upper']) {
              metricSituation = MetricSituation.Ok
              okMetricsCount++
            } else {
              if (metric['is_upper']) {
                if (resultsResponse.selected['metrics'][metric['id']] >= firstQuartile) {
                  metricSituation = MetricSituation.Reasonable
                  reasonableMetricsCount++
                } else {
                  metricSituation = MetricSituation.Bad
                  badMetricsCount++
                }
              } else {
                if (resultsResponse.selected['metrics'][metric['id']] <= thirdQuartile) {
                  metricSituation = MetricSituation.Reasonable
                  reasonableMetricsCount++
                } else {
                  metricSituation = MetricSituation.Bad
                  badMetricsCount++
                }
              }
            }

            metricInfo.push({
              id: metric['id'],
              name: metric['name'],
              description: metric['description'],
              is_upper: metric['is_upper'],
              category_id: metric['category_id'],
              values: {
                selected: selected,
                reference: refMetricsValues,
              },
              situation: metricSituation,
            })
          }
        })
        if (metricInfo.length > 0) metricsData.push({
          id: category.id,
          working_group: category['working_group'],
          description: category['description'],
          metrics: metricInfo,
        })
      })

      setMetricsData(metricsData)
      setAnalysisSummary({ okMetricsCount, reasonableMetricsCount, badMetricsCount })

      // Kick off AI insights asynchronously (does not block page render)
      loadInsights(resultsResponse['selected'], metricsData, resultsResponse['repos'])
    })

    setIsLoading(false)
  }

  const refreshAnalysis = (dataset: string, user: string, repo: string, n: number): void => {
    loadRepo(dataset, `${user}/${repo}`, n)
  }

  return (
    <>
      <Head>
        <title>{`HealthyEnv - Análise de ${router.query.repo}`} </title>
      </Head>
      <Header />
      {
        isLoading
          ? <div className={styles.loadingContainer}>
            <span className={styles.spinner} />
            <span className={styles.loadingText}>Obtendo resultados da análise...</span>
          </div>
          : <div className={styles.container}>
            <div className={styles['clustering-summary']}>
              <div className={styles['selected-repo-info']}>
                <div className={styles.repoInfoTitle}>
                  <span className={styles['repo-name']}>
                    {selectedRepoInfo['name']}
                  </span>
                  <div className={styles['repo-type-badge']}>
                    Adicionado pelo HealthyEnv
                    <FontAwesomeIcon icon={faCheck} style={{ marginLeft: 5, height: 'match-content' }} />
                  </div>
                </div>
                <RepoInfos
                  language={selectedRepoInfo['language']}
                  loc={selectedRepoInfo['loc']}
                  stars={selectedRepoInfo['stars']}
                  forks={selectedRepoInfo['forks']}
                  openIssues={selectedRepoInfo['open_issues']}
                  contributors={selectedRepoInfo['contributors']}
                  commits={selectedRepoInfo['commits']} />
                <span className={styles['algorithm-hint']}>
                  Algoritmo utilizado:
                </span>
                <span className={styles['algorithm-title']}>
                  Similaridade por distância
                </span>
                <span>
                  Este algoritmo busca no dataset os repositórios mais semelhantes
                  ao repositório selecionado, com base na distância entre eles no
                  plano de métricas.
                </span>
                <span className={styles.nearHint}>Obtendo <b>{+router.query.near}</b> projetos semelhantes.</span>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                  <div className={styles['change-algorithm-button']} onClick={() => setOpen(true)}>
                    <FontAwesomeIcon icon={faArrowRightArrowLeft} />
                    <span className={styles['button-label']}>
                      Trocar repositório
                    </span>
                  </div>
                  <div className={styles['change-algorithm-button']} onClick={() => setOpenN(true)}>
                    <FontAwesomeIcon icon={faArrowsRotate} />
                    <span className={styles['button-label']}>
                      Alterar quantidade de similares
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles['section-title']}>Resumo da análise</span>
              </div>
              <AnalysisSummarySection metricsCount={analysisSummary} />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles['section-title']}>Distribuição</span>
              </div>
              <NearReposPlot selectedRepoInfo={selectedRepoInfo} referenceReposInfo={referenceReposInfo} />
              <InsightCard text={insights?.cluster} loading={insightsLoading} />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles['section-title']}>Métricas aplicadas</span>
                <MetricsHint />
              </div>
              {
                metricsData.map((metricCategory: any) => {
                  return <PlotGrid
                    key={metricCategory['id']}
                    data={metricCategory}
                    insight={insights?.categories?.[metricCategory['id']]}
                    insightLoading={insightsLoading}
                  />
                })
              }
            </div>
            {(insightsLoading || insights?.recommendations) && (
              <div className={styles.section}>
                <div className={styles['section-title']}>
                  <span>Recomendações</span>
                </div>
                <InsightCard text={insights?.recommendations} loading={insightsLoading} />
              </div>
            )}

            <div className={styles.section}>
              <div className={styles['section-title']}>
                <span>Detalhes da requisição</span>
              </div>
              <div className={styles['request-details']}>
                <span className={styles['request-method']}>GET</span>
                <span className={styles['request-url']}>{requestPayloads[0].url}</span>
              </div>
              <div className={styles['response-body-container']}>
                <span className={styles['body-title']}>Corpo da resposta</span>
                <textarea rows={20} value={requestPayloads[0].payload} spellCheck={false} readOnly={true} />
              </div>
            </div>
          </div>
      }
      <Popup open={open} onClose={closeModalRepo} >
        <ChangeRepoModal closeModal={closeModalRepo} refreshAnalysis={refreshAnalysis} datasetId={router.query.datasetId} n={+router.query.near} />
      </Popup>
      <Popup open={openN} onClose={closeModalN} >
        <ChangeNModal closeModal={closeModalN} refreshAnalysis={refreshAnalysis} currNValue={+router.query.near} datasetCount={referenceReposInfo.length} datasetId={router.query.datasetId} userName={router.query.username} repoName={router.query.repo} />
      </Popup>

      {/* RAG Chatbot — only shown after loading is complete */}
      {!isLoading && (
        <ChatBot
          repoContext={{
            username: router.query.username as string,
            repo: router.query.repo as string,
            metrics: Object.fromEntries(
              metricsData.flatMap((cat: any) =>
                cat.metrics.map((m: any) => [m.name, m.values.selected.value])
              )
            ),
          }}
        />
      )}
    </>
  )
}

export default Repo