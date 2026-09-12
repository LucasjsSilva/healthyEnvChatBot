import dynamic from "next/dynamic"
import PlotLoadingIndicator from './PlotLoadingIndicator'
import styles from '../styles/AnalysisSummarySection.module.css'

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  // 300px em vez de 600 — este gráfico agora divide espaço com
  // "Distribuição" numa coluna, então a largura de espera precisa caber nela.
  loading: () => <PlotLoadingIndicator width={300} height={300} />,
})

interface AnalysisSummarySectionProps {
  metricsCount: object
}

const AnalysisSummarySection = (props: AnalysisSummarySectionProps) => {
  return (
    <div className={styles.analysisSummary}>
      <Plot
        useResizeHandler
        style={{ width: '100%', height: '300px' }}
        data={[{
          values: [props.metricsCount['okMetricsCount'], props.metricsCount['reasonableMetricsCount'], props.metricsCount['badMetricsCount']],
          labels: ['Métricas boas', 'Métricas razoáveis', 'Métricas ruins'],
          marker: {
            // Mesmos tons sólidos de --color-ok / --color-warn / --color-bad
            colors: ['#16a34a', '#d97706', '#dc2626'],
          },
          // Texto branco para manter contraste sobre os tons sólidos
          textfont: { color: '#ffffff' },
          type: 'pie',
        }]}
        layout={{
          autosize: true,
          height: 300,
        }}
      />
      <div className={styles.analysisValues}>
        <span className={styles.analysisTitle}>Métricas com valores saudáveis</span>
        <span className={styles.analysisSubtitle}>{props.metricsCount['okMetricsCount']}</span>
        <span className={styles.analysisTitle}>Métricas com valores razoáveis</span>
        <span className={styles.analysisSubtitle}>{props.metricsCount['reasonableMetricsCount']}</span>
        <span className={styles.analysisTitle}>Métricas com valores ruins</span>
        <span className={styles.analysisSubtitle}>{props.metricsCount['badMetricsCount']}</span>
        <span className={styles.analysisTitle}>Taxa de saúde</span>
        <span className={styles.analysisSubtitle}>~{
          Math.round((props.metricsCount['okMetricsCount']) * 100 / (props.metricsCount['okMetricsCount'] + props.metricsCount['reasonableMetricsCount'] + props.metricsCount['badMetricsCount']))
        }%</span>
      </div>
    </div>
  );
}

export default AnalysisSummarySection;