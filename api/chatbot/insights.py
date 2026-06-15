"""
Insights generator — produces humanized, per-category text interpretations
of a repository's metrics, a cluster comparison, and final recommendations.

Uses the same LLM configured for the RAG chatbot (Groq / OpenAI).
"""

from chatbot.rag_chain import _build_llm

_llm = None


def _get_llm():
    global _llm
    if _llm is None:
        _llm = _build_llm()
    return _llm


def _call_llm(prompt: str) -> str:
    response = _get_llm().invoke(prompt)
    return response.content if hasattr(response, "content") else str(response)


# ─── Prompt templates ────────────────────────────────────────────────────────

_CATEGORY_PROMPT = """\
Você é um especialista em saúde de repositórios GitHub que explica métricas \
para usuários NÃO técnicos.

Repositório: {repo_name}
Categoria analisada: {category_name}

Métricas coletadas (comparadas com repositórios similares do mesmo dataset):
{metrics_text}

Escreva UM parágrafo (3 a 5 frases) em português do Brasil, com linguagem \
clara e acessível, que:
1. Descreva o que as métricas desta categoria revelam sobre o repositório.
2. Destaque o que está bem ou preocupante com base nos valores e situações.
3. Sugira uma ação concreta caso haja algo a melhorar.

Responda APENAS com o parágrafo — sem título, sem marcadores, sem formatação extra.\
"""

_CLUSTER_PROMPT = """\
Você é um especialista em análise de repositórios GitHub.

O repositório "{repo_name}" foi comparado automaticamente com outros \
{total} repositórios do mesmo dataset, usando similaridade baseada em \
características como linguagem, linhas de código, estrelas, forks, issues \
abertas, contribuidores e commits.

Os {n_similar} repositório(s) mais similar(es) encontrado(s) foram: {similar_names}.

Escreva 2 a 3 frases em português do Brasil explicando o que essa comparação \
significa para um usuário não técnico — o que representa ter esses projetos \
como referência e o que o usuário pode aprender com essa comparação.

Responda APENAS com o texto — sem título, sem marcadores.\
"""

_RECOMMENDATIONS_PROMPT = """\
Você é um consultor de saúde de software analisando o repositório "{repo_name}".

Resumo das métricas analisadas:
- Métricas saudáveis (OK): {ok_count}
- Métricas razoáveis: {reasonable_count}
- Métricas preocupantes: {bad_count}

{bad_section}

Escreva de 2 a 4 recomendações práticas e objetivas em português do Brasil \
para melhorar a saúde deste repositório. Use frases de ação direta \
(ex: "Incentive commits menores e mais frequentes...").
Se não houver métricas ruins, indique que o repositório está em boa saúde \
e sugira ações de manutenção preventiva.

Responda com uma lista numerada simples — sem formatação markdown extra.\
"""

_SITUATION_LABELS = {
    "OK": "saudável",
    "REASONABLE": "razoável",
    "BAD": "preocupante",
}


# ─── Public function ──────────────────────────────────────────────────────────

def generate_insights(repo: dict, metrics_by_category: list, cluster: dict) -> dict:
    """
    Generates humanized AI insights for a repository analysis page.

    Args:
        repo: basic repo info dict (name, language, loc, stars, …)
        metrics_by_category: list of category dicts, each containing:
            { id, working_group, metrics: [{ id, name, value, situation, median_reference }] }
        cluster: { similar_repos: [str], total_repos_in_dataset: int }

    Returns:
        { "categories": { cat_id: text }, "cluster": text, "recommendations": text }
    """
    repo_name = repo.get("name", "repositório")

    # ── Per-category insights ─────────────────────────────────────────────────
    category_insights: dict = {}
    ok_count = 0
    reasonable_count = 0
    bad_count = 0
    bad_metrics_list: list[str] = []

    for category in metrics_by_category:
        lines = []
        for m in category["metrics"]:
            situation_label = _SITUATION_LABELS.get(m["situation"], m["situation"])
            value = m.get("value") or 0
            value_str = f"{round(value, 2)}" if isinstance(value, float) else str(value)
            line = f'- {m["name"]}: {value_str} (situação: {situation_label}'
            if m.get("median_reference") is not None:
                median_val = m["median_reference"]
                line += f', mediana dos similares: {round(median_val, 2) if isinstance(median_val, float) else median_val}'
            if m.get("diff_pct") is not None:
                diff = m["diff_pct"]
                if diff > 0:
                    line += f', {diff}% acima da mediana'
                elif diff < 0:
                    line += f', {abs(diff)}% abaixo da mediana'
                else:
                    line += ', igual à mediana'
            line += ")"
            lines.append(line)

            situation = m.get("situation", "")
            if situation == "OK":
                ok_count += 1
            elif situation == "REASONABLE":
                reasonable_count += 1
            else:
                bad_count += 1
                bad_metrics_list.append(f'{m["name"]} (valor: {value_str})')

        prompt = _CATEGORY_PROMPT.format(
            repo_name=repo_name,
            category_name=category["working_group"],
            metrics_text="\n".join(lines),
        )
        category_insights[category["id"]] = _call_llm(prompt)

    # ── Cluster insight ───────────────────────────────────────────────────────
    similar = cluster.get("similar_repos", [])
    total = cluster.get("total_repos_in_dataset", len(similar) + 1)
    cluster_insight = _call_llm(_CLUSTER_PROMPT.format(
        repo_name=repo_name,
        n_similar=len(similar),
        total=total,
        similar_names=", ".join(similar) if similar else "nenhum",
    ))

    # ── Recommendations ───────────────────────────────────────────────────────
    bad_section = (
        "Métricas que precisam de atenção:\n" + "\n".join(f"- {m}" for m in bad_metrics_list)
        if bad_metrics_list
        else "Nenhuma métrica com situação ruim foi identificada."
    )
    recommendations = _call_llm(_RECOMMENDATIONS_PROMPT.format(
        repo_name=repo_name,
        ok_count=ok_count,
        reasonable_count=reasonable_count,
        bad_count=bad_count,
        bad_section=bad_section,
    ))

    return {
        "categories": category_insights,
        "cluster": cluster_insight,
        "recommendations": recommendations,
    }
