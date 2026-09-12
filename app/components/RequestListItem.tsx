import styles from '../styles/RequestListItem.module.css'
import { ReactNode } from 'react';

interface RequestListItemProps {
  name: string
  email: string
  url: string
  status: string
  action?: ReactNode
}

const translateStatus = (status: string) => {
  switch (status) {
    case 'RECEIVED':
      return 'Recebido'
    case 'IN_PROGRESS':
      return 'Em andamento'
    case 'DONE':
      return 'Concluído'
    default:
      return 'Status desconhecido'
  }
}

const statusClass = (status: string) => {
  switch (status) {
    case 'RECEIVED':
      return styles.statusReceived
    case 'IN_PROGRESS':
      return styles.statusInProgress
    case 'DONE':
      return styles.statusDone
    default:
      return styles.statusUnknown
  }
}

const RequestListItem = (props: RequestListItemProps) => {
  return (
    <div className={styles.requestListItem}>
      <div className={styles.info}>
        <span className={styles.url}>{props.url.split('/')[props.url.split('/').length - 1]}</span>
      </div>
      <div className={`${styles.status} ${statusClass(props.status)}`}>{translateStatus(props.status)}</div>
      {props.action}
    </div>
  );
}

export default RequestListItem;
