import os
import threading
import requests
from datetime import datetime, timezone
from nanoid import generate

from db import db
from model.analysis_request import AnalysisRequestModel, AnalysisStatusEnum
from model.repository import RepositoryModel
from model.metric_repo import MetricRepoModel
from model.dataset import DatasetModel

# Metric name → DB id mapping (from metrics_ids.txt)
METRIC_IDS = {
    'code_changes_commits':                 'FNhzIJAQkt',
    'code_changes_lines_added':             'LVl1klYqh8',
    'code_changes_lines_removed':           'Hf1Ouu3eyQ',
    'code_changes_lines_avg_lines_commit':  '57T2l544Ji',
    'code_changes_lines_avg_files_commit':  'dr8Rb5ukkU',
    'avg_time_to_close':                    'fwClNGBocC',
    'avg_time_to_first_response':           'sK4Xhc5xpg',
    'contributors':                         'GbQLAZ3Cqt',
    'issues_active':                        'sRIxBbBEDf',
    'issues_age_avg':                       'oD00kl2u6O',
    'issues_age_max':                       'vkELxuOOtM',
    'issues_age_median':                    'Uzi_QQg1RQ',
    'issues_closed':                        'wPi1_kxvHc',
    'median_time_to_close':                 'VLPRbFJ12z',
    'median_time_to_first_response':        '33Ht7Ca99H',
    'truck_factor':                         'bOwjK67qRi',
    'max_change_set':                       'U7S5Hh5Ojg',
    'avg_change_set':                       'A79za5LrkK',
    'avg_highest_contributor_experience':   'oReVThP0K1',
}


def _github_headers(gh_token=None):
    """Build request headers using the user's OAuth token, falling back to a
    configured PAT (GH_PAT env var) for unauthenticated processing."""
    token = gh_token or os.environ.get('GH_PAT', '')
    headers = {'Accept': 'application/vnd.github+json'}
    if token:
        headers['Authorization'] = f'token {token}'
    return headers


def _get(url, headers, params=None):
    try:
        r = requests.get(url, headers=headers, params=params, timeout=15)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


def _paginate(url, headers, max_pages=10, extra_params=None):
    results = []
    for page in range(1, max_pages + 1):
        params = {'per_page': 100, 'page': page}
        if extra_params:
            params.update(extra_params)
        data = _get(url, headers, params)
        if not data:
            break
        results.extend(data)
        if len(data) < 100:
            break
    return results


def _collect_metrics(owner, repo_name, headers, gh_token=None):
    """Fetch data from GitHub API and compute all metrics."""
    base = f'https://api.github.com/repos/{owner}/{repo_name}'

    # ── Basic repo info ────────────────────────────────────────────────────────
    basic = _get(base, headers) or {}
    language = basic.get('language') or 'Unknown'
    stars = basic.get('stargazers_count', 0)
    forks = basic.get('forks_count', 0)
    open_issues_count = basic.get('open_issues_count', 0)

    # LOC: sum bytes from languages endpoint, ~35 bytes / line average
    lang_data = _get(f'{base}/languages', headers) or {}
    total_bytes = sum(lang_data.values()) if lang_data else 0
    loc = total_bytes // 35 if total_bytes else (basic.get('size', 0) * 30)

    # ── Contributors ───────────────────────────────────────────────────────────
    contributors_list = _paginate(f'{base}/contributors', headers, extra_params={'anon': 'false'})
    contributors_count = len(contributors_list)

    # Commit total from contributor stats (more accurate)
    stats = _get(f'{base}/stats/contributors', headers)
    if isinstance(stats, list):
        total_commits = sum(c.get('total', 0) for c in stats)
    else:
        total_commits = basic.get('pushed_at') and 0 or 0  # fallback

    # Truck factor: smallest group of devs responsible for ≥50 % of commits
    truck_factor = 0
    top_contributor_commits = 0
    if contributors_list:
        sorted_contribs = sorted(contributors_list, key=lambda c: c.get('contributions', 0), reverse=True)
        total_contribs = sum(c.get('contributions', 0) for c in sorted_contribs) or 1
        cumulative = 0
        for c in sorted_contribs:
            cumulative += c.get('contributions', 0)
            truck_factor += 1
            if cumulative >= total_contribs * 0.5:
                break
        top_contributor_commits = sorted_contribs[0].get('contributions', 0)

    # ── Commit-level metrics (sample recent commits) ───────────────────────────
    recent_commits = _paginate(f'{base}/commits', headers, max_pages=3)
    sample = recent_commits[:20]

    lines_added_list, lines_removed_list, files_changed_list = [], [], []
    for c in sample:
        detail = _get(f'{base}/commits/{c["sha"]}', headers) or {}
        st = detail.get('stats', {})
        lines_added_list.append(st.get('additions', 0))
        lines_removed_list.append(st.get('deletions', 0))
        files_changed_list.append(len(detail.get('files', [])))

    n = len(sample) or 1
    total_lines_added   = sum(lines_added_list)
    total_lines_removed = sum(lines_removed_list)

    # ── Issues metrics ─────────────────────────────────────────────────────────
    all_issues = _paginate(f'{base}/issues', headers, max_pages=5, extra_params={'state': 'all'})
    # GitHub issues API also returns PRs — filter them out
    all_issues = [i for i in all_issues if 'pull_request' not in i]

    closed_issues = [i for i in all_issues if i.get('state') == 'closed']
    open_issues   = [i for i in all_issues if i.get('state') == 'open']

    now = datetime.now(timezone.utc)

    ages = []
    for issue in open_issues:
        created = datetime.fromisoformat(issue['created_at'].replace('Z', '+00:00'))
        ages.append((now - created).days)

    time_to_close_list, time_to_first_response_list = [], []
    for issue in closed_issues[:50]:
        created = datetime.fromisoformat(issue['created_at'].replace('Z', '+00:00'))
        closed_str = issue.get('closed_at')
        if closed_str:
            closed_at = datetime.fromisoformat(closed_str.replace('Z', '+00:00'))
            time_to_close_list.append((closed_at - created).total_seconds() / 86400)

        comments = _get(issue['comments_url'], headers)
        if isinstance(comments, list) and comments:
            first = datetime.fromisoformat(comments[0]['created_at'].replace('Z', '+00:00'))
            time_to_first_response_list.append((first - created).total_seconds() / 86400)

    def _avg(lst):
        return sum(lst) / len(lst) if lst else 0.0

    def _median(lst):
        s = sorted(lst)
        return s[len(s) // 2] if s else 0.0

    return {
        # Repository fields
        'language':    language,
        'loc':         loc,
        'stars':       stars,
        'forks':       forks,
        'open_issues': open_issues_count,
        'contributors': contributors_count,
        'commits':     total_commits,
        # Computed metrics
        'metrics': {
            'code_changes_commits':                total_commits,
            'code_changes_lines_added':            total_lines_added,
            'code_changes_lines_removed':          total_lines_removed,
            'code_changes_lines_avg_lines_commit': (total_lines_added + total_lines_removed) / n,
            'code_changes_lines_avg_files_commit': sum(files_changed_list) / n,
            'max_change_set':                      max(files_changed_list) if files_changed_list else 0,
            'avg_change_set':                      _avg(files_changed_list),
            'contributors':                        contributors_count,
            'truck_factor':                        truck_factor,
            'avg_highest_contributor_experience':  top_contributor_commits,
            'issues_active':                       len(open_issues),
            'issues_closed':                       len(closed_issues),
            'issues_age_avg':                      _avg(ages),
            'issues_age_max':                      max(ages) if ages else 0.0,
            'issues_age_median':                   _median(ages),
            'avg_time_to_close':                   _avg(time_to_close_list),
            'median_time_to_close':                _median(time_to_close_list),
            'avg_time_to_first_response':          _avg(time_to_first_response_list),
            'median_time_to_first_response':       _median(time_to_first_response_list),
        },
    }


def _format_repo_for_index(owner: str, repo_name: str, data: dict) -> str:
    """Formats a repository's collected data as plain text for RAG indexing."""
    m = data['metrics']

    def _fmt(v):
        try:
            return f"{float(v):.2f}"
        except (TypeError, ValueError):
            return str(v)

    return (
        f"Repositório: {owner}/{repo_name}\n"
        f"Linguagem principal: {data['language']}\n"
        f"Linhas de código (LOC): {data['loc']}\n"
        f"Estrelas: {data['stars']}\n"
        f"Forks: {data['forks']}\n"
        f"Issues abertas: {data['open_issues']}\n"
        f"Contribuidores únicos: {data['contributors']}\n"
        f"Total de commits: {data['commits']}\n"
        "\nMétricas detalhadas:\n"
        f"- Commits totais: {_fmt(m.get('code_changes_commits', 0))}\n"
        f"- Linhas adicionadas: {_fmt(m.get('code_changes_lines_added', 0))}\n"
        f"- Linhas removidas: {_fmt(m.get('code_changes_lines_removed', 0))}\n"
        f"- Média de linhas por commit: {_fmt(m.get('code_changes_lines_avg_lines_commit', 0))}\n"
        f"- Média de arquivos por commit: {_fmt(m.get('code_changes_lines_avg_files_commit', 0))}\n"
        f"- Maior changeset (max_change_set): {_fmt(m.get('max_change_set', 0))}\n"
        f"- Changeset médio (avg_change_set): {_fmt(m.get('avg_change_set', 0))}\n"
        f"- Truck factor: {_fmt(m.get('truck_factor', 0))}\n"
        f"- Experiência do top contribuidor (commits): {_fmt(m.get('avg_highest_contributor_experience', 0))}\n"
        f"- Issues ativas: {_fmt(m.get('issues_active', 0))}\n"
        f"- Issues fechadas: {_fmt(m.get('issues_closed', 0))}\n"
        f"- Idade média das issues (dias): {_fmt(m.get('issues_age_avg', 0))}\n"
        f"- Idade máxima das issues (dias): {_fmt(m.get('issues_age_max', 0))}\n"
        f"- Idade mediana das issues (dias): {_fmt(m.get('issues_age_median', 0))}\n"
        f"- Tempo médio para fechar issue (dias): {_fmt(m.get('avg_time_to_close', 0))}\n"
        f"- Tempo mediano para fechar issue (dias): {_fmt(m.get('median_time_to_close', 0))}\n"
        f"- Tempo médio para primeira resposta (dias): {_fmt(m.get('avg_time_to_first_response', 0))}\n"
        f"- Tempo mediano para primeira resposta (dias): {_fmt(m.get('median_time_to_first_response', 0))}\n"
    )


def _do_process(app, request_id, dataset_id, repo_url, gh_token=None):
    """Background task: fetches GitHub metrics and stores results in the DB."""
    with app.app_context():
        try:
            # Mark as IN_PROGRESS (own transaction)
            with db.session.no_autoflush:
                ar = db.session.get(AnalysisRequestModel, request_id)
                ar.status = AnalysisStatusEnum.IN_PROGRESS
            db.session.commit()

            # Parse owner/repo_name from URL (e.g. https://github.com/owner/repo)
            parts = repo_url.rstrip('/').split('/')
            owner, repo_name = parts[-2], parts[-1]

            headers = _github_headers(gh_token)
            data = _collect_metrics(owner, repo_name, headers, gh_token)

            # Persist RepositoryModel
            repo_id = generate(size=10)
            repo_model = RepositoryModel(
                id=repo_id,
                name=f'{owner}/{repo_name}',
                language=data['language'],
                loc=data['loc'],
                stars=data['stars'],
                forks=data['forks'],
                open_issues=data['open_issues'],
                contributors=data['contributors'],
                commits=data['commits'],
                dataset_id=dataset_id,
            )
            db.session.add(repo_model)
            db.session.flush()  # get repo_id into DB before adding metrics

            # Persist MetricRepoModel entries — only for metric IDs that exist in the DB
            from model.metric import MetricModel
            valid_metric_ids = {m.id for m in MetricModel.query.all()}
            for metric_name, metric_id in METRIC_IDS.items():
                if metric_id not in valid_metric_ids:
                    print(f'[processor] Skipping unknown metric id={metric_id} ({metric_name})')
                    continue
                value = data['metrics'].get(metric_name, 0.0)
                mr = MetricRepoModel(
                    id=generate(size=10),
                    id_metric=metric_id,
                    id_repo=repo_id,
                    value=float(value),
                )
                db.session.add(mr)

            # Increment dataset repo_count and mark as DONE in same transaction
            with db.session.no_autoflush:
                dataset = db.session.get(DatasetModel, dataset_id)
                if dataset:
                    dataset.repo_count = (dataset.repo_count or 0) + 1
                ar = db.session.get(AnalysisRequestModel, request_id)
                ar.status = AnalysisStatusEnum.DONE

            db.session.commit()

            # ── Index repo in FAISS so the RAG chatbot learns from it ──────────
            try:
                from chatbot.rag_chain import add_repo_document
                repo_text = _format_repo_for_index(owner, repo_name, data)
                add_repo_document(repo_id, repo_text)
            except Exception as idx_err:
                print(f'[processor] Warning: could not index repo in RAG: {idx_err}')

            print(f'[processor] Done: {owner}/{repo_name}')

        except Exception as e:
            db.session.rollback()
            try:
                with db.session.no_autoflush:
                    ar = db.session.get(AnalysisRequestModel, request_id)
                    if ar:
                        ar.status = AnalysisStatusEnum.RECEIVED  # allow retry
                db.session.commit()
            except Exception:
                pass
            print(f'[processor] Error processing {repo_url}: {e}')


def process_repository_async(app, request_id, dataset_id, repo_url, gh_token=None):
    """Spawn a daemon thread to process the repository in the background."""
    t = threading.Thread(
        target=_do_process,
        args=(app, request_id, dataset_id, repo_url, gh_token),
        daemon=True,
    )
    t.start()
