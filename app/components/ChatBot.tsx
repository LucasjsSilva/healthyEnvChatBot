import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import styles from '../styles/ChatBot.module.css'
import Constants from '../utils/constants'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faComments, faXmark, faTrash, faPaperPlane } from '@fortawesome/free-solid-svg-icons'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatBotProps {
  /** Optional context of the repository currently being analyzed */
  repoContext?: {
    username: string
    repo: string
    metrics?: Record<string, number | null>
  }
}

// Simple random session ID for this browser tab
const SESSION_ID = Math.random().toString(36).slice(2)

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content:
    'Olá! Sou o assistente do HealthyEnv. 👋\n\nPosso te ajudar a entender as métricas de saúde deste repositório. Pergunte-me sobre qualquer métrica ou peça uma interpretação dos resultados!',
}

export default function ChatBot({ repoContext }: ChatBotProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const body: Record<string, unknown> = {
        session_id: SESSION_ID,
        message: text,
      }
      if (repoContext) {
        body.repo_context = repoContext
      }

      const res = await fetch(`${Constants.baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.answer ?? 'Não consegui gerar uma resposta.',
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Ocorreu um erro ao contatar o servidor. Tente novamente.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearHistory = async () => {
    try {
      await fetch(`${Constants.baseUrl}/chat/session/${SESSION_ID}`, {
        method: 'DELETE',
      })
    } catch {
      // ignore
    }
    setMessages([WELCOME_MESSAGE])
  }

  return (
    <>
      {/* Floating button */}
      <button
        className={styles.fab}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente'}
        title={open ? 'Fechar assistente' : 'Perguntar ao assistente'}
      >
        <FontAwesomeIcon icon={open ? faXmark : faComments} />
      </button>

      {/* Chat panel */}
      {open && (
        <div className={styles.panel}>
          {/* Header */}
          <div className={styles.header}>
            <span className={styles.headerTitle}>Assistente HealthyEnv</span>
            <button
              className={styles.clearBtn}
              onClick={clearHistory}
              title="Limpar conversa"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>

          {/* Messages */}
          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === 'user' ? styles.userBubble : styles.assistantBubble
                }
              >
                {msg.content.split('\n').map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < msg.content.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            ))}
            {loading && (
              <div className={styles.assistantBubble}>
                <span className={styles.typing}>●●●</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={styles.inputRow}>
            <textarea
              className={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre as métricas... (Enter para enviar)"
              rows={2}
              disabled={loading}
            />
            <button
              className={styles.sendBtn}
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
