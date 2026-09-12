import Chip from "./Chip"

interface RepoInfosProps {
  language: string
  loc: string
  stars: string
  forks: string
  openIssues: string
  contributors: string
  commits: string
}

const RepoInfos = (props: RepoInfosProps) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      // justifyContent: 'space-between',
    }}>
      <Chip label={props.language} />
      <Chip label={props.loc + ' LOC'} />
      <Chip label={props.stars + ' estrelas'} />
      <Chip label={props.forks + ' forks'} />
      <Chip label={props.openIssues + ' issues abertas'} />
      <Chip label={props.contributors + ' contribuidores'} />
      <Chip label={props.commits + ' commits'} />
    </div>
  )

}

export default RepoInfos