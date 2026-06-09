"""
Session manager for the RAG chatbot.

Keeps one message history list per session_id so that different
users/browser sessions have isolated conversation histories.
The RAG chain itself is stateless (built once and shared).
"""

import threading
from typing import Dict, List, Optional
from chatbot.rag_chain import build_rag_chain, messages_to_history
from langchain_core.runnables import Runnable


_lock = threading.Lock()

# Shared stateless chain (built lazily on first use)
_chain: Optional[Runnable] = None

# Per-session message history: list of {"role": "user"|"assistant", "content": str}
_histories: Dict[str, List[dict]] = {}


def _get_chain() -> Runnable:
    global _chain
    if _chain is None:
        _chain = build_rag_chain()
    return _chain


def ask(session_id: str, question: str) -> str:
    """
    Sends a question to the RAG chain and returns the answer.
    Maintains per-session conversation history.
    """
    with _lock:
        chain = _get_chain()
        history = _histories.setdefault(session_id, [])

        lc_history = messages_to_history(history)

        result = chain.invoke({
            "input": question,
            "chat_history": lc_history,
        })
        # chain returns a str directly (StrOutputParser at the end)
        answer: str = result if isinstance(result, str) else result.get("answer", "")

        # Persist the turn to history (keep last 10 turns = 20 messages)
        history.append({"role": "user",      "content": question})
        history.append({"role": "assistant", "content": answer})
        if len(history) > 20:
            _histories[session_id] = history[-20:]

    return answer


def delete_session(session_id: str) -> None:
    """Clears the conversation history for a session."""
    with _lock:
        _histories.pop(session_id, None)


def session_count() -> int:
    return len(_histories)
