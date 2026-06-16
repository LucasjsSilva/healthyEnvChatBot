import os
import json
import requests
from utils.error_responses import ErrorResponses
from model.dataset import DatasetModel
from model.metric import MetricModel
from model.repository import RepositoryModel
from model.analysis_request import AnalysisRequestModel
from model.metric_category import MetricCategory
from clustering.cluster import get_cluster
from processor import process_repository_async
from dotenv import load_dotenv
from db import db
from nanoid import generate
from waitress import serve

# Flask settings
from flask import Flask, Response, request
from flask_cors import CORS
app = Flask(__name__)
CORS(app)

# Load environment variables (must be called before any os.environ access)
load_dotenv(override=True)

# Database settings
db_user = os.environ['DB_USER']
db_password = os.environ['DB_PASSWORD']
db_host = os.environ['DB_HOST']
db_name = os.environ['DB_NAME']
app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{db_user}:{db_password}@{db_host}/{db_name}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)


# Creates database tables at startup
with app.app_context():
  from model.dataset import DatasetModel
  from model.repository import RepositoryModel
  from model.metric import MetricModel
  from model.metric_repo import MetricRepoModel
  from model.analysis_request import AnalysisRequestModel
  from model.metric_category import MetricCategory
  db.create_all()


@app.route('/datasets/<dataset_id>/cluster/<path:repo>')
def cluters(dataset_id, repo):
  # Check if the provided dataset id matches an existent dataset
  if not DatasetModel.find_dataset(dataset_id):
    return ErrorResponses.non_existent_dataset

  # Check if the provided repository name matches an existent repo
  if not RepositoryModel.find_repository(dataset_id, repo):
    return ErrorResponses.repo_not_found

  # Check if a n value was provided
  if not request.args.get('near_n'):
    return ErrorResponses.missing_n

  near_n = request.args['near_n'] # Save n value to a variable
  repos = RepositoryModel.get_dataset_repos(dataset_id)
  repos_count = len(repos)
  
  # Check if the provided n value is valid
  if (int(near_n) > (repos_count -1)) or (int(near_n) <= 0):
    return ErrorResponses.invalid_n(repos_count)
  
  # If everything is OK, it continues the process
  results = get_cluster(repos, dataset_id, repo, int(near_n))

  return Response(results, status=200, mimetype='application/json')


# Route to get all repos of a dataset
@app.route('/datasets/<dataset_id>/repos')
def dataset_repos(dataset_id):
  if DatasetModel.find_dataset(dataset_id):
    return Response(
      json.dumps(RepositoryModel.get_dataset_repos_json(dataset_id), indent=2),
      status=200, mimetype='application/json')
  else:
    return ErrorResponses.non_existent_dataset


# Route to get all available datasets
@app.route('/datasets')
def datasets():
  return Response(
    json.dumps(DatasetModel.get_all_datasets_json(), indent=2),
    status=200, mimetype='application/json')


# Route to get all available metrics
@app.route('/metrics')
def metrics():
  return Response(
    json.dumps(MetricModel.get_all_metrics_json(), indent=2),
    status=200, mimetype='application/json')


# Route to create a new analysis request
@app.route('/datasets/<dataset_id>/request', methods=['POST'])
def analysis_request(dataset_id: str):
  # Check if the provided dataset id matches an existent dataset
  if request.method == 'POST':
    if not DatasetModel.find_dataset(dataset_id):
      return ErrorResponses.non_existent_dataset
    
    # Get the data and save to database
    data = request.get_json(force=True)
    try:
      analysis_request = AnalysisRequestModel(generate(size=10), dataset_id, data['name'], data['email'], data['repo_url'])
      analysis_request.create_request()
    except KeyError:
      return ErrorResponses.missing_info

    # Trigger background processing immediately after saving the request
    gh_token = data.get('gh_token')
    process_repository_async(app, analysis_request.id, dataset_id, data['repo_url'], gh_token)

    return Response(
      json.dumps(analysis_request.json(), indent=2),
      status=200, mimetype='application/json')


# Route to get all requests of an user by email
@app.route('/requests/<email>')
def user_requests(email):
  return Response(
    json.dumps(AnalysisRequestModel.get_requests_by_id_json(email), indent=2),
    status=200, mimetype='application/json')


# Route to get all metric categories
@app.route('/metrics/categories')
def metric_categories():
  return Response(
    json.dumps(MetricCategory.get_all_metrics_categories_json(), indent=2),
    status=200, mimetype='application/json')


# Route to get GitHub auth token
@app.route('/auth/github_token')
def auth_github():
  if not request.args.get('code'):
    return ErrorResponses.missing_n

  code = request.args['code'] # Save the code to a variable

  r = requests.post(url = 'https://github.com/login/oauth/access_token', params = {
    'code': code,
    'client_id': os.environ['GH_CLIENT_ID'],
    'client_secret': os.environ['GH_CLIENT_SECRET']
  }, headers = {
    'Accept': 'application/json'
  })

  return Response(
    r.text,
    status=200, mimetype='application/json')


# ─── Chatbot RAG endpoints ────────────────────────────────────────────────────

from chatbot.session_manager import ask, delete_session
from chatbot.insights import generate_insights

@app.route('/chat', methods=['POST'])
def chat():
  """
  Receives a user message and returns the chatbot answer.

  Request body (JSON):
    {
      "session_id": "<string>",   # unique per browser session / user
      "message":    "<string>",   # user question
      "repo_context": {           # optional – current repo being viewed
        "username": "<string>",
        "repo":     "<string>",
        "metrics":  { ... }       # metric values from the dashboard (optional)
      }
    }

  Response body (JSON):
    {
      "answer": "<string>"
    }
  """
  data = request.get_json(force=True)

  session_id = data.get('session_id', '').strip()
  message    = data.get('message', '').strip()

  if not session_id or not message:
    return Response(
      json.dumps({'error': 'session_id and message are required'}),
      status=400, mimetype='application/json')

  provider = os.environ.get('LLM_PROVIDER', 'groq').lower()
  if provider == 'groq' and not os.environ.get('GROQ_API_KEY', ''):
    return Response(
      json.dumps({'error': 'GROQ_API_KEY not configured on the server'}),
      status=500, mimetype='application/json')
  if provider == 'openai' and not os.environ.get('OPENAI_API_KEY', ''):
    return Response(
      json.dumps({'error': 'OPENAI_API_KEY not configured on the server'}),
      status=500, mimetype='application/json')

  # Optionally enrich the message with current repo context
  repo_context = data.get('repo_context')
  enriched_message = message
  if repo_context:
    username = repo_context.get('username', '')
    repo     = repo_context.get('repo', '')
    metrics  = repo_context.get('metrics', {})
    if username and repo:
      enriched_message = (
        f"[Contexto: o usuário está analisando o repositório {username}/{repo}. "
        f"Métricas atuais: {json.dumps(metrics, ensure_ascii=False)}]\n\n{message}"
      )

  try:
    answer = ask(session_id, enriched_message)
  except Exception as e:
    return Response(
      json.dumps({'error': str(e)}),
      status=500, mimetype='application/json')

  return Response(
    json.dumps({'answer': answer}, ensure_ascii=False),
    status=200, mimetype='application/json')


@app.route('/chat/session/<session_id>', methods=['DELETE'])
def clear_chat_session(session_id):
  """Clears the conversation history for a session."""
  delete_session(session_id)
  return Response(
    json.dumps({'status': 'session cleared'}),
    status=200, mimetype='application/json')


import traceback as _traceback

@app.route('/insights', methods=['POST'])
def insights():
  """
  Generates humanized AI text interpretations for a repository analysis.

  Request body (JSON):
    {
      "repo": {
        "name": "<user/repo>",
        "language": "<string>",
        "loc": <int>,
        "stars": <int>,
        "forks": <int>,
        "open_issues": <int>,
        "contributors": <int>,
        "commits": <int>
      },
      "metrics_by_category": [
        {
          "id": "<category_id>",
          "working_group": "<string>",
          "metrics": [
            {
              "id": "<metric_id>",
              "name": "<string>",
              "value": <number>,
              "situation": "OK" | "REASONABLE" | "BAD",
              "median_reference": <number | null>
            }
          ]
        }
      ],
      "cluster": {
        "similar_repos": ["<repo_name>", ...],
        "total_repos_in_dataset": <int>
      }
    }

  Response body (JSON):
    {
      "categories": { "<category_id>": "<text>", ... },
      "cluster": "<text>",
      "recommendations": "<text>"
    }
  """
  data = request.get_json(force=True)

  repo = data.get('repo')
  metrics_by_category = data.get('metrics_by_category', [])
  cluster = data.get('cluster', {})

  if not repo or not metrics_by_category:
    return Response(
      json.dumps({'error': 'repo and metrics_by_category are required'}),
      status=400, mimetype='application/json')

  provider = os.environ.get('LLM_PROVIDER', 'groq').lower()
  if provider == 'groq' and not os.environ.get('GROQ_API_KEY', ''):
    return Response(
      json.dumps({'error': 'GROQ_API_KEY not configured on the server'}),
      status=500, mimetype='application/json')
  if provider == 'openai' and not os.environ.get('OPENAI_API_KEY', ''):
    return Response(
      json.dumps({'error': 'OPENAI_API_KEY not configured on the server'}),
      status=500, mimetype='application/json')

  try:
    result = generate_insights(repo, metrics_by_category, cluster)
  except Exception as e:
    return Response(
      json.dumps({'error': str(e), 'detail': _traceback.format_exc()}),
      status=500, mimetype='application/json')

  return Response(
    json.dumps(result, ensure_ascii=False),
    status=200, mimetype='application/json')


# ──────────────────────────────────────────────────────────────────────────────
# Backfill: index all existing repos in FAISS so the RAG learns from them
# Runs once in a background thread right after the app starts.
# ──────────────────────────────────────────────────────────────────────────────

import threading as _threading

def _backfill_rag_index():
    """Background task: indexes any repo already in the DB that isn't yet in FAISS."""
    with app.app_context():
        try:
            from model.repository import RepositoryModel
            from model.metric_repo import MetricRepoModel
            from model.metric import MetricModel
            from chatbot.rag_chain import index_repos_from_db

            repos = RepositoryModel.query.all()
            if not repos:
                return

            # Build metric id → name lookup
            metrics = MetricModel.query.all()
            metric_id_to_name = {m.id: m.name for m in metrics}

            repo_ids = [r.id for r in repos]
            all_metric_rows = MetricRepoModel.get_repos_metrics(repo_ids)

            # Group metric rows by repo id: { repo_id: { metric_name: value } }
            from collections import defaultdict
            metrics_by_repo = defaultdict(dict)
            for row in all_metric_rows:
                metric_name = metric_id_to_name.get(row.id_metric, row.id_metric)
                metrics_by_repo[row.id_repo][metric_name] = row.value

            repos_data = []
            for repo in repos:
                m = metrics_by_repo.get(repo.id, {})
                metrics_lines = "".join(
                    f"- {name}: {value:.2f}\n" for name, value in m.items()
                    if value is not None
                )
                text = (
                    f"Repositório: {repo.name}\n"
                    f"Linguagem principal: {repo.language}\n"
                    f"Linhas de código (LOC): {repo.loc}\n"
                    f"Estrelas: {repo.stars}\n"
                    f"Forks: {repo.forks}\n"
                    f"Issues abertas: {repo.open_issues}\n"
                    f"Contribuidores únicos: {repo.contributors}\n"
                    f"Total de commits: {repo.commits}\n"
                    f"\nMétricas:\n{metrics_lines}"
                )
                repos_data.append({"id": repo.id, "text": text})

            index_repos_from_db(repos_data)
        except Exception as e:
            print(f'[app] Warning: RAG backfill failed: {e}')


_threading.Thread(target=_backfill_rag_index, daemon=True).start()

# ──────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
  app.run(debug=True)
  # serve(app, host='0.0.0.0', port=8000)