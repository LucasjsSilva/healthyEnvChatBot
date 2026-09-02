import axios from 'axios'
import Router, { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Header from '../../../components/Header'
import RequestListItem from '../../../components/RequestListItem'
import styles from '../../../styles/RequestsByEmail.module.css'
import { Dots } from 'react-activity'
import "react-activity/dist/Dots.css";
import Head from 'next/head'
import Constants from '../../../utils/constants'

const RequestsByEmail = () => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [requests, setRequests] = useState([])

  useEffect(() => {
    if (!router.isReady) return
    verifyAuth()
    // If email param is "null", redirect to the correct login-based identifier
    if (router.query.email === 'null') {
      const raw = sessionStorage.getItem('userData')
      if (raw) {
        const user = JSON.parse(raw)
        const identifier = user?.email || user?.login
        if (identifier) {
          Router.replace(`/dashboard/requests/${identifier}`)
          return
        }
      }
    }
    loadRequests()
  }, [router.isReady, router.query.email])

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

  async function loadRequests() {
    setIsLoading(true)
    const response = await axios.get(`${Constants.baseUrl}/requests/${router.query.email}`)
    if (response.status == 200) {
      setRequests(response.data['items'])
    }
    setIsLoading(false)
  }

  const renderRequests = () => {
    const requestsList = []
    requests.forEach((request) => {
      requestsList.push(
        <RequestListItem key={request.id} name={request['name']} email={request['email']} url={request['repo_url']} status={request['status']} />
      )
    })

    return requestsList
  }

  return (
    <>
      <Head>
        <title>{`HealthyEnv - Solicitações de ${router.query.email}`}</title>
      </Head>
      <Header />
      <div className={styles.requestByEmail}>
        <div className={styles.info}>
          <span className={styles.title}>
            My submissions
          </span>
          <span className={styles.subtitle}>
            {router.query.email}
          </span>
          <span className={styles.description}>
            Here you can track the status of your submissions. Don&apos;t
            forget to check your email for more information about your
            submission.
          </span>
        </div>
        {!isLoading
          ? Object.keys(requests).length > 0
            ? renderRequests()
            : <span>No submissions found.</span>
          : (
            <div className={styles.loading}>
              <Dots color='#000000' size={18} speed={1} animating={true} />
              <span style={{
                fontSize: 14
              }}>Loading submissions...</span>
            </div>
          )}
      </div>
    </>
  );
}

export default RequestsByEmail;