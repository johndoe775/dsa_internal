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



class RelevanceOutput(BaseModel):
    option: Literal["yes", "no"]


def relevance(query: str) -> str:
    """
    Determines if a given query is relevant to data governance or its supporting domains.
    
    Args:
        query (str): The user question to evaluate.
        
    Returns:
        str: 'yes' if relevant, 'no' otherwise.
    """
    llm = get_llm()
    structured_llm = llm.with_structured_output(RelevanceOutput)

    relevance_prompt = """
You are a data governance expert. Your task is to determine whether the following question {query} is related to data governance or any of its supporting domains. Consider the question relevant if it pertains to any of the following areas:

*Core Data Governance Areas:*
- Data quality (accuracy, completeness, consistency, timeliness, validity)
- Data profiling, anomaly detection, outlier identification
- Data cleaning, data remediation, data standardization (including formulas or techniques)
- Metadata management, data lineage, data cataloging
- Access control, data classification, role-based permissions
- Policy enforcement, data stewardship, governance frameworks
- Compliance (GDPR, HIPAA, CCPA, etc.), auditability, regulatory reporting

*Indirect or Technical Relevance:*
- Statistical, analytical, or technical methods that contribute to:
  - Maintaining data integrity
  - Improving trustworthiness of data
  - Supporting governance processes or decision-making
- Questions involving data architecture, data modeling, or data integration that impact governance

*Not Relevant:*
- Questions purely about business strategy, software development, infrastructure, or unrelated technical domains unless they directly affect data governance.

Output format: Respond with only one word — either 'yes' or 'no'.
Do not explain your answer. Do not add anything else.
"""

    prompt = PromptTemplate(template=relevance_prompt, input_variables=["query"])
    chain = prompt | structured_llm
    result = chain.invoke({"query": query})
    return result.option   


prompt_template = """You are a helpful assistant. Use the following context to answer the question in detail. Be concise, accurate, and conversational.

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
    """
    Generate embeddings for a list of documents using Azure OpenAI.
    
    Args:
        docs (List[str]): List of document texts to embed.
        url (str): Azure OpenAI endpoint URL.
        api_key (str): API key for authentication.
        deployment_name (str): Name of the deployed embedding model.
    
    Returns:
        List[List[float]]: List of embedding vectors.
    """

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=10000, chunk_overlap=1000)
    split_docs = text_splitter.split_documents(docs)

    if not split_docs:
        raise ValueError("No content extracted from documents. Vector store cannot be created.")

    
     
    azure_embeddings = AzureOpenAIEmbeddings(
    azure_endpoint=os.getenv("em_url"),           # Correct: azure_endpoint
    api_key=os.getenv("em_api_key"),              # Correct: api_key (not openai_api_key)
    azure_deployment=os.getenv("em_name"),        # Correct: azure_deployment (not deployment)
    openai_api_version="2023-05-15"
)
    vectorstore_faiss = FAISS.from_documents(split_docs, azure_embeddings)
    return vectorstore_faiss

def get_response_llm(llm, vectorstore, query):
    try:
        if not query.strip():
            return "❌ Query is empty. Please enter a valid question."

        retriever = vectorstore.as_retriever()
        retrieval_chain = (
            {"context": retriever, "question": RunnablePassthrough()}
            | PROMPT
            | llm
        )

        return retrieval_chain.invoke(query).content

    except Exception as e:
        return f"❌ Error: {e}"  