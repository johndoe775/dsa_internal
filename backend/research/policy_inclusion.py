from typing import Optional, Dict, Any
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough

# -----------------------------
# Policy-aware prompt (no docs)
# -----------------------------
POLICY_PROMPT_TEMPLATE = """You are a helpful assistant. There are no context documents available.
You must GAUGE the user's query strictly against the provided POLICY and answer ONLY within the policy scope.

If fully in scope: answer concisely with bullet points or short steps.
If partially covered: answer what is covered and ask ONE clarifying question.
If not covered: say "Not covered by policy" and suggest the closest relevant angle. Do not invent policy content.

<policy>
{policy}
</policy>

Question: {query}

Answer format:
1) One-line "Alignment" statement (in/out/partial scope).
2) The answer (bullets or short steps). If partial, add ONE clarifying question.
3) End with: "Policy alignment: <short reason>"

Assistant:
"""

POLICY_PROMPT = PromptTemplate(
    template=POLICY_PROMPT_TEMPLATE,
    input_variables=["query", "policy"]
)


# -------------------------------------------------------------
# Async fallback when NO docs are present (policy-only answer)
# -------------------------------------------------------------
async def generate_policy_only_answer_async(
        llm,
        query: str,
        policy: str,
        *,
        temperature: float = 0.2,
        max_tokens: Optional[int] = 800
) -> str:
    """
    Build a policy-aware prompt and get an async LLM answer when there are NO documents.

    Args:
        llm: A LangChain chat model (e.g., ChatOpenAI / Azure ChatOpenAI) that supports `.ainvoke(...)`.
        query: User's text question.
        policy: Selected policy/category name or short description.
        temperature: Sampling temperature (default 0.2 for determinism in policy tasks).
        max_tokens: Optional max token cap for the model.

    Returns:
        A string with the assistant's answer. Returns a user-friendly error message on failure.
    """
    try:
        # Basic input checks (mirror your style)
        if not query or not query.strip():
            return "❌ Query is empty. Please enter a valid question."
        if not policy or not policy.strip():
            return "❌ Policy is empty. Please select a policy."

        # Compose chain: fill prompt -> llm
        # (We pass params via a mapping so both {query} and {policy} are available.)
        chain = POLICY_PROMPT | llm.bind(temperature=temperature, max_tokens=max_tokens)

        result = await chain.ainvoke({"query": query, "policy": policy})

        # LangChain chat models typically return an AIMessage with `.content`
        if hasattr(result, "content") and isinstance(result.content, str):
            return result.content

        # In case some model returns raw text
        return str(result) if result is not None else "No response generated."

    except Exception as e:
        return f"❌ Error: {e}"