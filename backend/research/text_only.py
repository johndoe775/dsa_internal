from typing import Optional, Dict, Any
from langchain_core.prompts import PromptTemplate

prompt_template = """
You are a helpful assistant. Evaluate the provided query against the given policy. Determine whether the query complies with, partially complies with, or violates the policy. Provide a clear, concise judgment with reasoning.

<query>
{query}
</query>

<policy>
{policy}
</policy>

Evaluation:
"""

PROMPT = PromptTemplate(template=prompt_template, input_variables=["query", "policy"])


def get_text_only_response_llm(llm, query, policy):
    try:
        if not query.strip():
            return "❌ Query is empty. Please enter a valid question."


        retrieval_chain = PROMPT | llm

        return retrieval_chain.invoke({"query": query, "policy": policy}).content

    except Exception as e:
        return f"❌ Error: {e}"

