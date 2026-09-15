from datetime import datetime, timezone
from db import db


class RagInteractionLog(db.Model):
  """
  Raw instrumentation record for every RAG chatbot exchange — question,
  retrieved chunks (with relevance score), whether retrieval passed the
  relevance threshold, and the final answer. Written for later evaluation
  of retrieval/answer quality (e.g. manual relevance labeling, RAGAS-style
  metrics) — this table intentionally stores raw data, not scores; scoring
  methodology is a separate, later decision.
  """
  __tablename__ = 'rag_interaction_log'

  id = db.Column(db.String(10), primary_key=True)
  session_id = db.Column(db.String(80))
  question = db.Column(db.Text)
  answer = db.Column(db.Text)
  # [{"content": str, "score": float, "repo_id": str|None, "relevant": bool}, ...]
  retrieved_chunks = db.Column(db.JSON)
  num_chunks_retrieved = db.Column(db.Integer)
  num_chunks_relevant = db.Column(db.Integer)
  below_threshold = db.Column(db.Boolean)
  relevance_threshold = db.Column(db.Float)
  llm_provider = db.Column(db.String(20))
  llm_model = db.Column(db.String(80))
  latency_ms = db.Column(db.Float)
  created_at = db.Column(db.DateTime)


  def __init__(self, id, session_id, question, answer, retrieved_chunks,
               num_chunks_retrieved, num_chunks_relevant, below_threshold,
               relevance_threshold, llm_provider, llm_model, latency_ms):
    self.id = id
    self.session_id = session_id
    self.question = question
    self.answer = answer
    self.retrieved_chunks = retrieved_chunks
    self.num_chunks_retrieved = num_chunks_retrieved
    self.num_chunks_relevant = num_chunks_relevant
    self.below_threshold = below_threshold
    self.relevance_threshold = relevance_threshold
    self.llm_provider = llm_provider
    self.llm_model = llm_model
    self.latency_ms = latency_ms
    self.created_at = datetime.now(timezone.utc)


  def save(self):
    db.session.add(self)
    db.session.commit()
