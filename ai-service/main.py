
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from io import BytesIO

app = FastAPI(title="HireAI Resume Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "https://hireai-frontend-khbb.onrender.com",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Skills that HireAI can currently recognize.
# We can expand this list as the project grows.
SKILLS = [
    "Python",
    "Java",
    "JavaScript",
    "React",
    "Spring Boot",
    "SQL",
    "MySQL",
    "Machine Learning",
    "Deep Learning",
    "Natural Language Processing",
    "NLP",
    "Large Language Models",
    "LLM",
    "TensorFlow",
    "PyTorch",
    "Scikit-learn",
    "Pandas",
    "NumPy",
    "AWS",
    "Azure",
    "Docker",
    "Git",
    "C++",
    "C",
    "HTML",
    "CSS",
    "Data Analysis",
    "Data Science",
    "Computer Vision",
    "REST API",
]

def detect_skills(text: str) -> list[str]:
    detected = []
    text_lower = text.lower()

    for skill in SKILLS:
        if skill.lower() in text_lower:
            detected.append(skill)

    return detected
    
import re
import requests



def normalize_skill(skill: str) -> str:
    aliases = {
        "js": "javascript",
        "javascript": "javascript",
        "ml": "machine learning",
        "machine learning": "machine learning",
        "dl": "deep learning",
        "deep learning": "deep learning",
        "nlp": "natural language processing",
        "natural language processing": "natural language processing",
        "llm": "large language models",
        "llms": "large language models",
        "large language model": "large language models",
        "large language models": "large language models",
        "sklearn": "scikit-learn",
        "scikit learn": "scikit-learn",
        "scikit-learn": "scikit-learn",
        "react.js": "react",
        "reactjs": "react",
        "springboot": "spring boot",
        "spring boot": "spring boot",
    }

    cleaned = " ".join(skill.strip().lower().split())
    return aliases.get(cleaned, cleaned)


def calculate_match(candidate_skills: list[str], required_skills: str):
    required = list(dict.fromkeys(
        normalize_skill(skill)
        for skill in required_skills.split(",")
        if skill.strip()
    ))

    candidate_normalized = {
        normalize_skill(skill)
        for skill in candidate_skills
        if skill.strip()
    }

    matched = [
        skill for skill in required
        if skill in candidate_normalized
    ]

    missing = [
        skill for skill in required
        if skill not in candidate_normalized
    ]

    score = round(len(matched) / len(required) * 100) if required else 0

    return {
        "matchPercentage": score,
        "matchedSkills": matched,
        "missingSkills": missing,
        "totalRequiredSkills": len(required),
    }



@app.get("/api/jobs/match")
def match_jobs(skills: str):
    try:
        response = requests.get(
            "http://localhost:8080/api/jobs",
            timeout=5
        )
        response.raise_for_status()
        jobs = response.json()

        candidate_skills = [
            skill.strip() for skill in skills.split(",") if skill.strip()
        ]

        results = []

        for job in jobs:
            match = calculate_match(
                candidate_skills,
                job.get("requiredSkills", "")
            )

            results.append({
                "jobId": job.get("id"),
                "title": job.get("title"),
                "company": job.get("company"),
                "location": job.get("location"),
                **match,
            })

        results.sort(
            key=lambda item: item["matchPercentage"],
            reverse=True
        )

        return {"candidateSkills": candidate_skills, "recommendations": results}

    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Could not reach the Spring Boot jobs API. Check that the backend is running."
        )


@app.get("/")
def home():
    return {"message": "HireAI AI Service is running!"}


@app.post("/api/resume/extract")
async def extract_resume(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF resume."
        )

    try:
        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="The uploaded PDF is empty."
            )

        reader = PdfReader(BytesIO(content))

        if reader.is_encrypted:
            raise HTTPException(
                status_code=400,
                detail="Password-protected PDFs are not supported."
            )

        text = "\n".join(
            page.extract_text() or "" for page in reader.pages
        ).strip()

        if not text:
            raise HTTPException(
                status_code=422,
                detail="No readable text found. The PDF may be scanned."
            )

        detected_skills = detect_skills(text)

        return {
            "filename": file.filename,
            "pages": len(reader.pages),
            "extractedText": text,
            "detectedSkills": detected_skills,
            "skillCount": len(detected_skills),
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read this PDF. Please try another file."
        )
    finally:
        await file.close()