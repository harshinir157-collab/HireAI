
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from io import BytesIO
import requests

app = FastAPI(title="HireAI Resume Analysis API")

# Allow the local and deployed React frontend to access this API.
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

# Skills currently recognized by HireAI.
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

    score = (
        round(len(matched) / len(required) * 100)
        if required else 0
    )

    return {
        "matchPercentage": score,
        "matchedSkills": matched,
        "missingSkills": missing,
        "totalRequiredSkills": len(required),
    }


@app.get("/")
def home():
    return {"message": "HireAI AI Service is running!"}


@app.get("/api/jobs/match")
def match_jobs(skills: str):
    try:
        # Connect to the deployed Spring Boot backend.
        response = requests.get(
            "https://hireai-backend-f3oy.onrender.com/api/jobs",
            timeout=30,
        )
        response.raise_for_status()
        jobs = response.json()

        if not isinstance(jobs, list):
            raise HTTPException(
                status_code=502,
                detail="The jobs API returned an unexpected response.",
            )

        candidate_skills = [
            skill.strip()
            for skill in skills.split(",")
            if skill.strip()
        ]

        results = []

        for job in jobs:
            match = calculate_match(
                candidate_skills,
                job.get("requiredSkills", ""),
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
            reverse=True,
        )

        return {
            "candidateSkills": candidate_skills,
            "recommendations": results,
        }

    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail=(
                "Could not reach the Spring Boot jobs API. "
                "Please try again later."
            ),
        )


@app.post("/api/resume/extract")
async def extract_resume(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF resume.",
        )

    try:
        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="The uploaded PDF is empty.",
            )

        reader = PdfReader(BytesIO(content))

        if reader.is_encrypted:
            raise HTTPException(
                status_code=400,
                detail="Password-protected PDFs are not supported.",
            )

        extracted_text = "\n".join(
            page.extract_text() or ""
            for page in reader.pages
        ).strip()

        if not extracted_text:
            raise HTTPException(
                status_code=422,
                detail=(
                    "No readable text found. "
                    "The PDF may be scanned."
                ),
            )

        detected_skills = detect_skills(extracted_text)

        return {
            "filename": file.filename,
            "pages": len(reader.pages),
            "extractedText": extracted_text,
            "detectedSkills": detected_skills,
            "skillCount": len(detected_skills),
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read this PDF. Please try another file.",
        )
    finally:
        await file.close()
