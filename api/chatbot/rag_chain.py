"""
RAG Chatbot module for HealthyEnv.

Built with LangChain Core (LCEL) + FAISS.
Embeddings: free local model via sentence-transformers (no OpenAI needed).
LLM: Groq (free) or OpenAI — controlled by LLM_PROVIDER env var.
"""

import json
import os
import shutil
from typing import List, Tuple

from langchain_community.document_loaders import TextLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.language_models import BaseChatModel
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage


# Relevance threshold for retrieved chunks, as FAISS L2 distance (lower =
# more similar; there is no fixed 0-1 range for this metric, it depends on
# the embedding space). Empirically measured against the real index
# (2026-09-14, paraphrase-multilingual-MiniLM-L12-v2): top-1 distance for
# on-topic questions ("o que significa o truck factor?", "como interpretar
# issues antigas?") landed at 9-14; top-1 distance for off-topic questions
# ("receita de bolo", "copa do mundo de 2018") landed at 23-29. 18.0 sits in
# the gap between those two clusters. Configurable since this is a starting
# point to be tuned with real usage data (see RagInteractionLog).
RELEVANCE_MAX_DISTANCE = float(os.environ.get("RAG_RELEVANCE_MAX_DISTANCE", "18.0"))


# Path to the knowledge base markdown file
KB_PATH = os.path.join(os.path.dirname(__file__), "knowledge_base", "metrics_knowledge.md")

# FAISS index persistence path
FAISS_INDEX_PATH = os.path.join(os.path.dirname(__file__), "faiss_index")

# File that tracks which repo IDs have already been indexed (avoids duplicates)
INDEXED_REPOS_PATH = os.path.join(FAISS_INDEX_PATH, "indexed_repos.json")

QA_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "Você é um assistente especializado em métricas de saúde de repositórios GitHub, "
     "integrado à ferramenta HealthyEnv. Seu objetivo é ajudar usuários NÃO especialistas "
     "a entender o que significam as métricas apresentadas pelo sistema, "
     "como interpretá-las e quais ações tomar.\n\n"
     "Regras:\n"
     "- Responda SEMPRE em português do Brasil.\n"
     "- Use linguagem clara, acessível e amigável — evite jargão técnico sem explicação.\n"
     "- Baseie suas respostas APENAS nas informações do contexto abaixo.\n"
     "- Se não souber a resposta com base no contexto, diga isso claramente.\n"
     "- Quando um valor de métrica for fornecido, interprete-o com base nas faixas descritas.\n"
     "- Mantenha respostas concisas mas completas (máximo 3-4 parágrafos).\n\n"
     "Contexto recuperado da base de conhecimento:\n{context}"),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
])


def _get_embeddings() -> HuggingFaceEmbeddings:
    """Free local embeddings — downloaded once and cached by sentence-transformers."""
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        model_kwargs={"device": "cpu"},
    )


def _build_vectorstore() -> FAISS:
    embeddings = _get_embeddings()

    if os.path.exists(FAISS_INDEX_PATH):
        return FAISS.load_local(
            FAISS_INDEX_PATH,
            embeddings,
            allow_dangerous_deserialization=True,
        )  # type: ignore[arg-type]

    loader = TextLoader(KB_PATH, encoding="utf-8")
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        separators=["\n## ", "\n### ", "\n\n", "\n", " "],
    )
    chunks = splitter.split_documents(documents)

    vectorstore = FAISS.from_documents(chunks, embeddings)
    vectorstore.save_local(FAISS_INDEX_PATH)
    return vectorstore


def _build_llm() -> Tuple[BaseChatModel, str, str]:
    """
    Returns (llm, provider, model_name) based on LLM_PROVIDER env var.
    - 'groq'   -> ChatGroq (free tier) — needs GROQ_API_KEY, model via GROQ_MODEL
    - 'openai' -> ChatOpenAI           — needs OPENAI_API_KEY
    provider/model_name are returned alongside (rather than read back off the
    LLM object later) so callers can log exactly what was configured.
    """
    provider = os.environ.get("LLM_PROVIDER", "groq").lower()
    if provider == "groq":
        from langchain_groq import ChatGroq
        groq_key = os.environ.get("GROQ_API_KEY", "")
        if not groq_key:
            raise ValueError("GROQ_API_KEY not configured")
        # llama models are no longer available on Groq for all accounts; default to a widely available model
        groq_model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
        return ChatGroq(model=groq_model, temperature=0.2, api_key=groq_key), "groq", groq_model
    # OpenAI fallback
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        raise ValueError("OPENAI_API_KEY not configured")
    from langchain_openai import ChatOpenAI
    openai_model = "gpt-3.5-turbo"
    return ChatOpenAI(model=openai_model, temperature=0.2, api_key=openai_key), "openai", openai_model


class RagPipeline:
    """
    Bundles the vectorstore and the answer-generation chain so callers
    (session_manager) can retrieve context explicitly — with relevance
    scores, for logging and threshold filtering — before invoking the LLM,
    instead of retrieval being hidden inside an opaque LCEL chain.
    """

    def __init__(self, vectorstore: FAISS, llm: BaseChatModel, provider: str, model_name: str):
        self.vectorstore = vectorstore
        self.provider = provider
        self.model_name = model_name
        self._answer_chain = QA_PROMPT | llm | StrOutputParser()

    def retrieve_with_scores(self, query: str, k: int = 4) -> List[Tuple[Document, float]]:
        """Returns [(Document, l2_distance), ...] — lower distance = more similar."""
        return self.vectorstore.similarity_search_with_score(query, k=k)

    def answer(self, question: str, chat_history: List[BaseMessage], context: str) -> str:
        result = self._answer_chain.invoke({
            "input": question,
            "chat_history": chat_history,
            "context": context,
        })
        return result if isinstance(result, str) else str(result)


def build_rag_pipeline() -> RagPipeline:
    """Builds the RAG pipeline (vectorstore + LLM) used by session_manager."""
    vectorstore = _build_vectorstore()
    llm, provider, model_name = _build_llm()
    return RagPipeline(vectorstore, llm, provider, model_name)


def rebuild_index() -> None:
    if os.path.exists(FAISS_INDEX_PATH):
        shutil.rmtree(FAISS_INDEX_PATH)
    _build_vectorstore()


# ─── Repo document indexing (RAG learns from real repos) ──────────────────────

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=100,
    separators=["\n\n", "\n", " "],
)


def _load_indexed_repo_ids() -> set:
    """Returns the set of repo IDs already present in the FAISS index."""
    if os.path.exists(INDEXED_REPOS_PATH):
        try:
            with open(INDEXED_REPOS_PATH, encoding="utf-8") as f:
                return set(json.load(f))
        except Exception:
            pass
    return set()


def _save_indexed_repo_ids(ids: set) -> None:
    os.makedirs(FAISS_INDEX_PATH, exist_ok=True)
    with open(INDEXED_REPOS_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted(ids), f)


def add_repo_document(repo_id: str, text: str) -> None:
    """
    Adds a single repository document to the FAISS index.
    Safe to call multiple times for the same repo_id — duplicates are skipped.
    """
    indexed = _load_indexed_repo_ids()
    if repo_id in indexed:
        return

    docs = _splitter.split_documents([Document(page_content=text, metadata={"repo_id": repo_id})])
    vectorstore = _build_vectorstore()
    vectorstore.add_documents(docs)
    vectorstore.save_local(FAISS_INDEX_PATH)

    indexed.add(repo_id)
    _save_indexed_repo_ids(indexed)

    # Invalidate the cached pipeline so the next request uses the updated index
    from chatbot import session_manager as _sm
    with _sm._lock:
        _sm._pipeline = None


def index_repos_from_db(repos_data: List[dict]) -> None:
    """
    Bulk-indexes repositories from the DB that have not been indexed yet.

    Each item in repos_data must have:
      - "id":   unique repo identifier
      - "text": pre-formatted text document for the repo
    """
    indexed = _load_indexed_repo_ids()
    new_docs: List[Document] = []
    new_ids: List[str] = []

    for repo in repos_data:
        if repo["id"] not in indexed:
            docs = _splitter.split_documents(
                [Document(page_content=repo["text"], metadata={"repo_id": repo["id"]})]
            )
            new_docs.extend(docs)
            new_ids.append(repo["id"])

    if not new_docs:
        return

    vectorstore = _build_vectorstore()
    vectorstore.add_documents(new_docs)
    vectorstore.save_local(FAISS_INDEX_PATH)

    indexed.update(new_ids)
    _save_indexed_repo_ids(indexed)

    # Invalidate cached pipeline
    from chatbot import session_manager as _sm
    with _sm._lock:
        _sm._pipeline = None

    print(f"[rag_chain] Indexed {len(new_ids)} new repo(s) into FAISS.")


def messages_to_history(messages: List[dict]) -> List[BaseMessage]:
    result: List[BaseMessage] = []
    for m in messages:
        if m["role"] == "user":
            result.append(HumanMessage(content=m["content"]))
        elif m["role"] == "assistant":
            result.append(AIMessage(content=m["content"]))
    return result
