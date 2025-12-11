from typing import List, Optional
import io
import pandas as pd
from fastapi import FastAPI, Form,UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PyPDF2 import PdfReader
from langchain_core.documents import Document
#from research.policy_inclusion import generate_policy_only_answer_async

#from res_sys import GovernanceAdvisor
from embeddings_hf import get_llm,get_vector_store_hf,get_response_llm,relevance

app = FastAPI(title="Governance Advisory API")







# Allow CORS for local testing; adjust origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _text_from_upload(upload: UploadFile) -> str:
    """Extract plain text from an uploaded file based on extension.

    Supports txt, pdf, csv, xls, xlsx.
    """
    content = upload.file.read()
    # reset pointer (not strictly required since we don't reuse file)
    try:
        ext = upload.filename.split(".")[-1].lower()
    except Exception:
        ext = ""

    if ext == "txt":
        try:
            return content.decode("utf-8")
        except Exception:
            return content.decode("latin-1", errors="ignore")

    if ext == "pdf":
        # PdfReader can take a BytesIO
        try:
            reader = PdfReader(io.BytesIO(content))
            text = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)
            return "\n".join(text)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF parse error: {e}")

    if ext == "csv":
        try:
            df = pd.read_csv(io.BytesIO(content))
            return df.to_string()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"CSV parse error: {e}")

    if ext in ["xls", "xlsx"]:
        try:
            df = pd.read_excel(io.BytesIO(content))
            return df.to_string()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Excel parse error: {e}")

    raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")






@app.post("/qna")
async def qna(query: str = Form(...), 
              policy: str = Form(...),
    files: Optional[List[UploadFile]] = File(None)):
    """Answer a query against the provided uploaded files or raw text.

    - `query` is required.
    - Provide either `files` (one or more) or `text`.
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    response=relevance(query)

    if response=="yes":

        texts = []
        if files:
            for upload in files:
                texts.append(_text_from_upload(upload))
        
        else:
            raise HTTPException(status_code=400, detail="Provide either files or text to query against")
            #answer=await generate_policy_only_answer_async(llm=get_llm(),query=query,policy=policy)

        

        docs = [Document(page_content=t) for t in texts]
        vector_store = get_vector_store_hf(docs)
        llm = get_llm()
        answer = get_response_llm(llm, vector_store, query)



        return {"query": query, "answer": answer,"response":response}
    else:
        return {"query": query, "answer": "The question is not related to Data Governance. Please ask a relevant question.","response":response}

@app.get("/")
async def root():
    return {"message": "Governance Advisory FastAPI is running. Use /recommendations and /qna."}

