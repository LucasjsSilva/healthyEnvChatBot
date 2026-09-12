"""
Insights generator — produces humanized, per-category text interpretations
of a repository's metrics, a cluster comparison, and final recommendations.

Uses the same LLM configured for the RAG chatbot (Groq / OpenAI).
"""

import json
import re

from chatbot.rag_chain import _build_llm

_llm = None


def _get_llm():
    global _llm
    if _llm is None:
        _llm = _build_llm()
    return _llm


def _call_llm(prompt: str, json_mode: bool = False, max_tokens: int | None = None) -> str:
    llm = _get_llm()
    bind_kwargs: dict = {}
    if json_mode:
        # Ask the provider to enforce valid JSON output rather than relying
        # on the model following a plain-text instruction — much more
        # reliable for the batched multi-category response.
        bind_kwargs["response_format"] = {"type": "json_object"}
    if max_tokens is not None:
        bind_kwargs["max_tokens"] = max_tokens
    if bind_kwargs:
        llm = llm.bind(**bind_kwargs)
    response = llm.invoke(prompt)
    return response.content if hasattr(response, "content") else str(response)


# ─── Prompt templates ────────────────────────────────────────────────────────

# Generates the interpretation for every metric category in a single LLM call
# (instead of one call per category) to stay well within Groq's free-tier
# tokens-per-minute rate limit — see the /insights root-cause investigation.
_CATEGORIES_BATCH_PROMPT = """\
Você é um especialista em saúde de repositórios GitHub que explica métricas \
para usuários NÃO técnicos.

Repositório: {repo_name}

Abaixo estão várias categorias de métricas coletadas (comparadas com \
repositórios similares do mesmo dataset):

{categories_text}

Para CADA categoria acima, escreva um parágrafo (3 a 5 frases) em português \
do Brasil, com linguagem clara e acessível, que:
1. Descreva o que as métricas desta categoria revelam sobre o repositório.
2. Destaque o que está bem ou preocupante com base nos valores e situações.
3. Sugira uma ação concreta caso haja algo a melhorar.

Responda APENAS com um objeto JSON válido (sem markdown, sem texto antes ou \
depois), usando exatamente estes IDs de categoria como chaves: {category_ids}

Formato: {{"<id_da_categoria>": "<parágrafo>", ...}}\
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


def _extract_json_object(text: str) -> str:
    """Strips markdown code fences / stray text some models wrap JSON in."""
    match = re.search(r"\{.*\}", text.strip(), re.DOTALL)
    return match.group(0) if match else text


def _generate_category_insights_batch(
    repo_name: str, category_ids: list[str], category_blocks: list[str]
) -> dict:
    """
    Generates the per-category interpretation text for every category in a
    single LLM call (instead of one call per category), since Groq's free
    tier rate-limits by tokens-per-minute rather than request count — nine
    sequential calls per analysis was enough to trigger repeated 429 retries.
    """
    if not category_ids:
        return {}

    prompt = _CATEGORIES_BATCH_PROMPT.format(
        repo_name=repo_name,
        categories_text="\n\n".join(category_blocks),
        category_ids=", ".join(category_ids),
    )

    fallback_text = "Não foi possível gerar uma interpretação para esta categoria no momento."
    category_insights: dict = {}
    raw = None
    try:
        # Generous ceiling: each category needs a paragraph (~150-250 tokens)
        # plus JSON overhead — leave enough room that the response is never
        # truncated mid-document, whatever the category count.
        raw = _call_llm(prompt, json_mode=True, max_tokens=600 * max(len(category_ids), 1) + 500)
        parsed = json.loads(_extract_json_object(raw))
        for cid in category_ids:
            value = parsed.get(cid)
            category_insights[cid] = value if isinstance(value, str) and value.strip() else fallback_text
    except Exception as e:
        # Malformed JSON, unexpected LLM output, or the call itself failed —
        # degrade gracefully instead of failing the whole /insights request,
        # but log loudly so the failure is diagnosable.
        print(f'[insights] category batch failed: {type(e).__name__}: {e}')
        if raw is not None:
            print(f'[insights] raw LLM output (first 2000 chars):\n{raw[:2000]}')
        for cid in category_ids:
            category_insights[cid] = fallback_text

    return category_insights


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

    # ── Per-category insights (batched into a single LLM call) ────────────────
    category_ids: list[str] = []
    category_blocks: list[str] = []
    ok_count = 0
    reasonable_count = 0
    bad_count = 0
    bad_metrics_list: list[str] = []

    for category in metrics_by_category:
        category_ids.append(category["id"])
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

        category_blocks.append(
            f'Categoria "{category["id"]}" — {category["working_group"]}:\n' + "\n".join(lines)
        )

    category_insights = _generate_category_insights_batch(
        repo_name, category_ids, category_blocks
    )

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
