import Router, { useRouter } from 'next/router'
import { useEffect } from 'react'
import Head from 'next/head'

const RequestsByEmailRedirect = () => {
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) return

    let isAuthenticated = false
    try {
      const raw = sessionStorage.getItem('userData')
      if (raw) {
        const data = JSON.parse(raw)
        isAuthenticated = data && (Date.now() - (data['timestamp'] || 0)) <= 86400000
      }
    } catch {}

    if (isAuthenticated) {
      Router.replace('/dashboard/submissions')
    } else {
      Router.replace(`/auth?next=/dashboard/submissions`)
    }
  }, [router.isReady])

  return (
    <>
      <Head>
        <title>HealthyEnv - Redirecionando...</title>
      </Head>
    </>
  )
}

export default RequestsByEmailRedirect
