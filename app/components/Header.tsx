import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { faBars } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import Router, { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import AccountMenuButton from './AccountMenuButton'
import styles from '../styles/Header.module.css'

interface UserInfo {
  name: string
  email: string
  profilePicture: string
  timestamp: number
}

const NAV_ITEMS = [
  { href: '/dashboard/datasets', label: 'Analisar repositório' },
  { href: '/dashboard/submit', label: 'Enviar repositório' },
  { href: '/about', label: 'Sobre' },
]

const SESSION_TTL_MS = 86400000

const Header = () => {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = sessionStorage.getItem('userData')
      if (!raw) return
      const data = JSON.parse(raw)
      if (Date.now() - data.timestamp > SESSION_TTL_MS) return
      setUserInfo(data)
    } catch (e) { }
  }, [])

  function logout() {
    sessionStorage.removeItem('userData')
    setUserInfo(null)
    Router.push('/')
  }

  function isActive(href: string) {
    return router.pathname === href || router.pathname.startsWith(`${href}/`)
  }

  const loginHref = `/auth?next=${router.asPath}`

  return (
    <div className={styles.header}>
      <div
        id='mySidenav'
        className={styles.sidenav}
        style={showDrawer ? { minWidth: '280px' } : { minWidth: '0px' }}
      >
        <button className={styles.closebtn} onClick={() => setShowDrawer(false)}>&times;</button>
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={styles.navLink} style={isActive(item.href) ? { color: '#f1f5f9', fontWeight: 700 } : undefined}>
              {item.label}
            </a>
          </Link>
        ))}
        <div className={styles.sidenavAuth}>
          {userInfo ? (
            <>
              <a className={styles.navLink} onClick={() => Router.push('/dashboard/submissions')}>
                Minhas submissões
              </a>
              <a className={styles.navLink} onClick={logout}>
                Sair
              </a>
            </>
          ) : (
            <Link href={loginHref}>
              <a className={styles.navLink}>Entrar</a>
            </Link>
          )}
        </div>
      </div>

      <div style={{
        marginLeft: 'auto',
        marginRight: 'auto',
        maxWidth: '1280px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
        }}>
          <div className={styles.drawerButton} onClick={() => setShowDrawer(true)}>
            <FontAwesomeIcon icon={faBars} />
          </div>
          <Link href='/'>
            <a>
              <span className={styles.title}>HealthyEnv</span>
            </a>
          </Link>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              <a>
                <span className={styles.link} style={isActive(item.href) ? { color: '#f1f5f9', fontWeight: 700 } : undefined}>
                  {item.label}
                </span>
              </a>
            </Link>
          ))}
        </div>
        <div className={styles.options}>
          {userInfo ? (
            <AccountMenuButton
              profilePicture={userInfo.profilePicture}
              userName={userInfo.name}
              userEmail={userInfo.email}
              onLogout={logout}
            />
          ) : (
            <Link href={loginHref}>
              <a><span className={styles.signupButton}>Entrar</span></a>
            </Link>
          )}
          <a
            href='https://github.com/SERG-UFPI/healthyEnv'
            className={styles.icon}
            target='_blank'
            rel='noreferrer'
          >
            <FontAwesomeIcon icon={faGithub} />
          </a>
        </div>
      </div>
    </div>
  )
}

export default Header
