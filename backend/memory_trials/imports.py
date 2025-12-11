from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_openai import AzureOpenAIEmbeddings
from langchain_openai import AzureChatOpenAI
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import PromptTemplate
from typing import Literal
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()

# ---------------- MEMORY (minimal patch) ----------------
from langchain.memory import ConversationBufferMemory
from langchain.chains import LLMChain

memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True
)
# --------------------------------------------------------


class RelevanceOutput(BaseModel):
    option: Literal["yes", "no"]


def relevance(query: str) -> str:
    llm = get_llm()
    structured_llm = llm.with_structured_output(RelevanceOutput)

    relevance_prompt = """
You are a data governance expert. Your task is to determine whether the following question {query} is related to data governance or any of its supporting domains...

Output format: Respond with only one word — either 'yes' or 'no'.
"""

    prompt = PromptTemplate(template=relevance_prompt, input_variables=["query"])
    chain = prompt | structured_llm
    result = chain.invoke({"query": query})
    return result.option


prompt_template = """You are a helpful assistant. Use the following context to answer the question in detail.

<context>
{context}
</context>

Question: {question}

Assistant:"""

PROMPT = PromptTemplate(template=prompt_template, input_variables=["context", "question"])


def get_llm(deployment_name: str = "gpt-4o-mini") -> AzureChatOpenAI:
    return AzureChatOpenAI(
        azure_deployment=os.getenv("DEPLOYMENT_NAME"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        temperature=0.3,
    )


def get_vector_store_hf(docs):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=10000, chunk_overlap=1000)
    split_docs = text_splitter.split_documents(docs)

    if not split_docs:
        raise ValueError("No content extracted from documents.")

    azure_embeddings = AzureOpenAIEmbeddings(
        azure_endpoint=os.getenv("em_url"),
        api_key=os.getenv("em_api_key"),
        azure_deployment=os.getenv("em_name"),
        openai_api_version="2023-05-15"
    )

    return FAISS.from_documents(split_docs, azure_embeddings)


# ---------------- UPDATED get_response_llm (minimal memory patch) ----------------
def get_response_llm(llm, vectorstore, query):
    """
    Minimal memory patch:
    - retrieval unchanged
    - context unchanged
    - retriever passed directly as context
    - only LLM call now wrapped with memory
    """

    try:
        if not query.strip():
            return "❌ Query is empty. Please enter a valid question."

        retriever = vectorstore.as_retriever()

        # Only change: wrap final LLM in LLMChain with memory
        global memory
        chain = LLMChain(
            llm=llm,
            prompt=PROMPT,
            memory=memory,
            verbose=False
        )

        # context remains EXACTLY retriever (your request)
        result = chain.invoke({
            "context": retriever,
            "question": query
        })

        # handle chain output
        if isinstance(result, dict):
            return result.get("text") or result.get("content")

        return result

    except Exception as e:
        return f"❌ Error: {e}"
# -------------------------------------------------------------------------------
