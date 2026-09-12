import { useEffect, useRef, useState, ReactNode } from 'react'
import styles from '../styles/Reveal.module.css'

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
}

const Reveal = ({ children, delay = 0, className = '' }: RevealProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      // threshold: 0 dispara assim que o primeiro pixel entra na tela — com
      // 0.15 (15% da altura do próprio bloco), blocos muito altos (ex.: a
      // seção de métricas na tela de análise, com vários gráficos
      // empilhados) podem nunca satisfazer a razão antes de já terem sido
      // rolados quase todos para fora da viewport, deixando um vão em
      // branco enorme até o "pop" tardio no meio da rolagem.
      { threshold: 0, rootMargin: '0px 0px -10% 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.visible : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default Reveal
