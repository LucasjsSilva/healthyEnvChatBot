import dynamic from 'next/dynamic';
import PlotLoadingIndicator from './PlotLoadingIndicator';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  // 300px em vez de 600 — este gráfico agora divide espaço com "Resumo da
  // análise" numa coluna, então a largura de espera precisa caber nela.
  loading: () => <PlotLoadingIndicator width={300} height={300} />,
})

interface NearReposPlotProps {
  selectedRepoInfo: object
  referenceReposInfo: object[]
}

const NearReposPlot = (props: NearReposPlotProps) => {
  return (
    <Plot
      useResizeHandler
      style={{ width: '100%', height: '300px' }}
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
        autosize: true,
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
        // Legenda horizontal embaixo do gráfico, não vertical à direita —
        // o nome do repositório selecionado (uma das séries) pode ser
        // longo, e a legenda vertical padrão do Plotly não encolhe o
        // texto, só ultrapassa a borda do card num layout de 2 colunas.
        legend: {
          orientation: 'h',
          x: 0.5,
          xanchor: 'center',
          y: -0.2,
        },
        margin: { t: 40, b: 60, l: 30, r: 30 },
      }}
    />
  );
}

export default NearReposPlot;