"""
RAG Chatbot module for HealthyEnv.

Built with LangChain Core (LCEL) + FAISS.
Embeddings: free local model via sentence-transformers (no OpenAI needed).
LLM: Groq (free) or OpenAI — controlled by LLM_PROVIDER env var.
"""

import os
import shutil
from typing import List

from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.language_models import BaseChatModel
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage


# Path to the knowledge base markdown file
KB_PATH = os.path.join(os.path.dirname(__file__), "knowledge_base", "metrics_knowledge.md")

# FAISS index persistence path
FAISS_INDEX_PATH = os.path.join(os.path.dirname(__file__), "faiss_index")

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


def _build_llm() -> BaseChatModel:
    """
    Returns the LLM based on LLM_PROVIDER env var.
    - 'groq'   -> ChatGroq (free tier, llama-3.3-70b) — needs GROQ_API_KEY
    - 'openai' -> ChatOpenAI                          — needs OPENAI_API_KEY
    """
    provider = os.environ.get("LLM_PROVIDER", "groq").lower()
    if provider == "groq":
        from langchain_groq import ChatGroq
        groq_key = os.environ.get("GROQ_API_KEY", "")
        if not groq_key:
            raise ValueError("GROQ_API_KEY not configured")
        return ChatGroq(model="llama-3.3-70b-versatile", temperature=0.2, api_key=groq_key)
    # OpenAI fallback
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        raise ValueError("OPENAI_API_KEY not configured")
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(model="gpt-3.5-turbo", temperature=0.2, api_key=openai_key)


def build_rag_chain():
    """Builds a stateless RAG chain using LCEL primitives."""
    vectorstore = _build_vectorstore()
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
    llm = _build_llm()

    def _retrieve_and_format(inputs: dict) -> str:
        docs = retriever.invoke(inputs["input"])
        return "\n\n".join(doc.page_content for doc in docs)

    chain = (
        RunnablePassthrough.assign(context=_retrieve_and_format)
        | QA_PROMPT
        | llm
        | StrOutputParser()
    )
    return chain


def rebuild_index() -> None:
    if os.path.exists(FAISS_INDEX_PATH):
        shutil.rmtree(FAISS_INDEX_PATH)
    _build_vectorstore()


def messages_to_history(messages: List[dict]) -> List[BaseMessage]:
    result: List[BaseMessage] = []
    for m in messages:
        if m["role"] == "user":
            result.append(HumanMessage(content=m["content"]))
        elif m["role"] == "assistant":
            result.append(AIMessage(content=m["content"]))
    return result
