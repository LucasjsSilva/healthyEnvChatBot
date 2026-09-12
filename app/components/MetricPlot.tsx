import dynamic from 'next/dynamic'
import styles from '../styles/MetricPlot.module.css'
import PlotLoadingIndicator from './PlotLoadingIndicator'
import { getMedian } from '../functions/stats'

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <PlotLoadingIndicator width={0} height={500} />
})

enum MetricSituation {
  Ok = 'OK',
  Reasonable = 'REASONABLE',
  Bad = 'BAD',
}

interface MetricPlotProps {
  yAll: number[]
  ySelected: number
  labels: string[]
  name: string
  title: string
  width: number
  situation: MetricSituation
  isUpper: boolean
}

const MetricPlot = (props: MetricPlotProps) => {
  const getColor = (situation: MetricSituation): string => {
    switch (situation) {
      case MetricSituation.Ok:
        return '#c4ffcc'
      case MetricSituation.Reasonable:
        return '#fceec2'
      case MetricSituation.Bad:
        return '#fad6d6'
    }
  }

  const validValues = props.yAll.filter((v) => v != null && !isNaN(v))
  const median = validValues.length > 0 ? getMedian(validValues) : null
  const selected = props.ySelected

  const formatVal = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Number(v.toFixed(2)))

  let diffLabel: string | null = null
  let diffPositive: boolean | null = null
  if (median != null && median !== 0 && selected != null) {
    const pct = ((selected - median) / median) * 100
    const absPct = Math.abs(pct).toFixed(0)
    if (pct > 0) {
      diffLabel = `+${absPct}% acima da mediana`
      // Being above the median is only "good" for metrics where higher is better.
      diffPositive = props.isUpper
    } else if (pct < 0) {
      diffLabel = `${absPct}% abaixo da mediana`
      // Being below the median is "good" precisely when higher is NOT better.
      diffPositive = !props.isUpper
    } else {
      diffLabel = 'igual à mediana'
      diffPositive = null
    }
  }

  return (
    <div className={styles.box} style={{ width: `${props.width}px`, height: `${560}px`, backgroundColor: getColor(props.situation) }}>
      <Plot
        data={[
          {
            y: props.yAll,
            text: props.labels,
            type: 'box',
            name: 'Métrica',
            pointpos: -1.8,
            boxpoints: 'all',
            jitter: 0.3,
            boxmean: true,
            quartilemethod: 'inclusive'
          },
          {
            y: [props.ySelected],
            x: ['Métrica'],
            text: [props.name],
            name: 'Repositório',
            marker: { size: 8 },
            pointpos: -1.0,
          }
        ]}
        layout={{
          width: props.width - 10,
          height: 500,
          title: props.title,
          font: { family: 'Inter, sans-serif', color: '#0f172a' },
          plot_bgcolor: getColor(props.situation),
          paper_bgcolor: getColor(props.situation),
          yaxis: { type: 'log', autorange: true, showgrid: false, zeroline: true },
        }}
      />
      {median != null && (
        <div className={styles.medianRow}>
          <span className={styles.medianLabel}>
            Mediana dos similares: <strong>{formatVal(median)}</strong>
          </span>
          {diffLabel && (
            <span
              className={styles.diffBadge}
              style={{
                background:
                  diffPositive === true ? '#16a34a' :
                  diffPositive === false ? '#dc2626' : '#64748b',
              }}
            >
              {diffLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default MetricPlot