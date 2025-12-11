from typing import List, Optional
import io
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader
from langchain_core.documents import Document

from research.text_only import get_text_only_response_llm

# IMPORT updated functions
from embeddings_hf import get_llm, get_vector_store_hf, get_response_llm, relevance

app = FastAPI(title="Governance Advisory API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _text_from_upload(upload: UploadFile) -> str:
    content = upload.file.read()

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
        try:
            reader = PdfReader(io.BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
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
async def qna(
    query: str = Form(...),
    policy: str = Form(...),
    files: Optional[List[UploadFile]] = File(None)
):
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")

    if files and len(files) > 0:
        response = relevance(query)

        if response == "yes":
            texts = []
            for upload in files:
                texts.append(_text_from_upload(upload))

            docs = [Document(page_content=t) for t in texts]

            vector_store = get_vector_store_hf(docs)
            llm = get_llm()
            answer = get_response_llm(llm, vector_store, query)

            return {"query": query, "answer": answer, "response": response}

        else:
            return {
                "query": query,
                "answer": "The question is not related to Data Governance. Please ask a relevant question.",
                "response": response,
            }

    else:
        response = relevance(query)

        if response == "yes":
            answer = get_text_only_response_llm(llm=get_llm(), query=query, policy=policy)
            return {"query": query, "answer": answer, "response": "no uploads"}

        else:
            return {
                "query": query,
                "answer": "The question is not related to Data Governance. Please ask a relevant question.",
                "response": "no uploads",
            }


@app.get("/")
async def root():
    return {"message": "Governance Advisory FastAPI is running. Use /recommendations and /qna."}
