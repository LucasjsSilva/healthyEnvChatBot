import dynamic from 'next/dynamic';
import PlotLoadingIndicator from './PlotLoadingIndicator';
import useWindowDimensions from "../utils/useWindowDimensions"

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <PlotLoadingIndicator width={600} height={300} />,
})

interface NearReposPlotProps {
  selectedRepoInfo: object
  referenceReposInfo: object[]
}

const NearReposPlot = (props: NearReposPlotProps) => {
  const { width } = useWindowDimensions()

  let safeWidth = width - 17 > 1280 ? 1280 - 72 : width - 17 - 72;

  return (
    <Plot
      data={[
        {
          x: props.referenceReposInfo.map((repo) => { if (!repo['near']) return repo['x'] }),
          y: props.referenceReposInfo.map((repo) => { if (!repo['near']) return repo['y'] }),
          text: props.referenceReposInfo.map((repo) => { if (!repo['near']) return repo['name'] }),
          name: 'distantes',
          type: 'scatter',
          mode: 'markers',
          // "Distante" é só menos parecido, não "ruim" — cinza neutro (--color-text-muted)
          marker: { color: '#94a3b8' },
        },
        {
          x: props.referenceReposInfo.map((repo) => { if (repo['near']) return repo['x'] }),
          y: props.referenceReposInfo.map((repo) => { if (repo['near']) return repo['y'] }),
          text: props.referenceReposInfo.map((repo) => { if (repo['near']) return repo['name'] }),
          name: 'próximos',
          type: 'scatter',
          mode: 'markers',
          // --color-primary
          marker: { color: '#2563eb' },
        },
        {
          x: [props.selectedRepoInfo['x']],
          y: [props.selectedRepoInfo['y']],
          text: [props.selectedRepoInfo['name']],
          name: props.selectedRepoInfo['name'],
          type: 'scatter',
          mode: 'markers',
          // --color-accent, pra destacar o repositório selecionado
          marker: { color: '#6366f1', size: 10 },
        },
      ]}
      layout={{
        width: safeWidth,
        height: 300,
        title: 'Repositórios próximos ao selecionado',
        xaxis: {
          showticklabels: false,
        },
        yaxis: {
          showticklabels: false,
        },
        font: {
          family: 'Inter, sans-serif',
          color: '#0f172a'
        },
        plot_bgcolor: '#ffffff',
        paper_bgcolor: '#ffffff',
      }}
    />
  );
}

export default NearReposPlot;