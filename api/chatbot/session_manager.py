"""
Session manager for the RAG chatbot.

Keeps one message history list per session_id so that different
users/browser sessions have isolated conversation histories.
The RAG pipeline itself is stateless (built once and shared).
"""

import threading
import time
from typing import Dict, List, Optional, TypedDict
from nanoid import generate

from chatbot.rag_chain import RagPipeline, build_rag_pipeline, messages_to_history, RELEVANCE_MAX_DISTANCE


class Source(TypedDict):
    label: str
    excerpt: str


class AskResult(TypedDict):
    answer: str
    sources: List[Source]
    below_threshold: bool


_lock = threading.Lock()

# Shared stateless pipeline (built lazily on first use)
_pipeline: Optional[RagPipeline] = None

# Per-session message history: list of {"role": "user"|"assistant", "content": str}
_histories: Dict[str, List[dict]] = {}


def _get_pipeline() -> RagPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = build_rag_pipeline()
    return _pipeline


def _log_interaction(session_id, question, answer, scored_docs, relevant_docs, latency_ms, pipeline):
    """
    Persists raw instrumentation data for this exchange — never lets a
    logging failure break the chat response (the whole point is to collect
    data for later analysis, not to gate the feature on it).
    """
    try:
        from model.rag_interaction_log import RagInteractionLog

        relevant_ids = {id(doc) for doc, _ in relevant_docs}
        chunks = [
            {
                "content": doc.page_content,
                "score": float(score),
                "repo_id": doc.metadata.get("repo_id"),
                "relevant": id(doc) in relevant_ids,
            }
            for doc, score in scored_docs
        ]

        log = RagInteractionLog(
            id=generate(size=10),
            session_id=session_id,
            question=question,
            answer=answer,
            retrieved_chunks=chunks,
            num_chunks_retrieved=len(scored_docs),
            num_chunks_relevant=len(relevant_docs),
            below_threshold=len(relevant_docs) == 0,
            relevance_threshold=RELEVANCE_MAX_DISTANCE,
            llm_provider=pipeline.provider,
            llm_model=pipeline.model_name,
            latency_ms=latency_ms,
        )
        log.save()
    except Exception as e:
        print(f'[session_manager] Warning: could not log RAG interaction: {e}')


def _build_sources(relevant_docs) -> List[Source]:
    """
    Turns the chunks that passed the relevance threshold into user-facing
    source references — a short excerpt plus a label saying whether it came
    from the static metrics knowledge base or from a specific indexed repo.
    This is what makes RAG answers traceable to the frontend, instead of
    the retrieval step being invisible to the person reading the answer.
    """
    sources: List[Source] = []
    for doc, _score in relevant_docs:
        repo_id = doc.metadata.get("repo_id")
        label = f"Repositório indexado ({repo_id})" if repo_id else "Base de conhecimento de métricas"
        excerpt = doc.page_content.strip().replace("\n", " ")
        if len(excerpt) > 220:
            excerpt = excerpt[:220].rstrip() + "…"
        sources.append({"label": label, "excerpt": excerpt})
    return sources


def ask(session_id: str, question: str) -> AskResult:
    """
    Sends a question to the RAG pipeline and returns the answer along with
    the sources that grounded it (empty if retrieval was below the
    relevance threshold) — for a chatbot answer to be traceable, the caller
    needs more than just the generated text.
    Maintains per-session conversation history.
    """
    # Only the shared-state read is locked — snapshot the pipeline reference
    # and a copy of this session's history, then release the lock before the
    # network calls (retrieval + LLM). Holding _lock across those would
    # serialize every chat request app-wide (across all sessions/users) for
    # the whole duration of each call.
    with _lock:
        pipeline = _get_pipeline()
        history = list(_histories.setdefault(session_id, []))

    lc_history = messages_to_history(history)

    t0 = time.monotonic()

    # Retrieve with scores so we can filter by relevance and log what was
    # actually retrieved — the LLM call below only sees chunks that pass
    # the threshold, instead of always getting exactly k chunks regardless
    # of whether any of them are actually relevant to the question.
    scored_docs = pipeline.retrieve_with_scores(question, k=4)
    relevant_docs = [(doc, score) for doc, score in scored_docs if score <= RELEVANCE_MAX_DISTANCE]
    context = "\n\n".join(doc.page_content for doc, _ in relevant_docs)

    answer = pipeline.answer(question, lc_history, context)
    latency_ms = (time.monotonic() - t0) * 1000

    # Persist the turn to history (keep last 10 turns = 20 messages)
    with _lock:
        history = _histories.setdefault(session_id, [])
        history.append({"role": "user",      "content": question})
        history.append({"role": "assistant", "content": answer})
        if len(history) > 20:
            _histories[session_id] = history[-20:]

    _log_interaction(session_id, question, answer, scored_docs, relevant_docs, latency_ms, pipeline)

    return {
        "answer": answer,
        "sources": _build_sources(relevant_docs),
        "below_threshold": len(relevant_docs) == 0,
    }


def delete_session(session_id: str) -> None:
    """Clears the conversation history for a session."""
    with _lock:
        _histories.pop(session_id, None)


def session_count() -> int:
    return len(_histories)
