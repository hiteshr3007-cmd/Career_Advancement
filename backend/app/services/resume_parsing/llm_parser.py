import json

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

RESUME_JSON_SCHEMA = {
    "name": "resume_extraction",
    "schema": {
        "type": "object",
        "properties": {
            "personal_info": {
                "type": "object",
                "properties": {
                    "name": {"type": ["string", "null"]},
                    "email": {"type": ["string", "null"]},
                    "phone": {"type": ["string", "null"]},
                    "location": {"type": ["string", "null"]},
                    "linkedin": {"type": ["string", "null"]},
                    "github": {"type": ["string", "null"]},
                },
                "required": ["name", "email", "phone", "location", "linkedin", "github"],
                "additionalProperties": False,
            },
            "summary": {"type": ["string", "null"]},
            "education": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "degree": {"type": ["string", "null"]},
                        "field_of_study": {"type": ["string", "null"]},
                        "institution": {"type": ["string", "null"]},
                        "start_year": {"type": ["string", "null"]},
                        "end_year": {"type": ["string", "null"]},
                        "grade": {"type": ["string", "null"]},
                    },
                    "required": ["degree", "field_of_study", "institution", "start_year", "end_year", "grade"],
                    "additionalProperties": False,
                },
            },
            "experience": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": ["string", "null"]},
                        "company": {"type": ["string", "null"]},
                        "industry": {"type": ["string", "null"]},
                        "start_date": {"type": ["string", "null"]},
                        "end_date": {"type": ["string", "null"]},
                        "is_current": {"type": "boolean"},
                        "description": {"type": ["string", "null"]},
                    },
                    "required": ["title", "company", "industry", "start_date", "end_date", "is_current", "description"],
                    "additionalProperties": False,
                },
            },
            "skills": {"type": "array", "items": {"type": "string"}},
            "certifications": {"type": "array", "items": {"type": "string"}},
            "projects": {"type": "array", "items": {"type": "string"}},
            "achievements": {"type": "array", "items": {"type": "string"}},
            "keywords": {"type": "array", "items": {"type": "string"}},
            "industry_classification": {"type": ["string", "null"]},
        },
        "required": [
            "personal_info", "summary", "education", "experience", "skills",
            "certifications", "projects", "achievements", "keywords", "industry_classification",
        ],
        "additionalProperties": False,
    },
    "strict": True,
}

SYSTEM_PROMPT = (
    "You are a resume parsing engine. Extract structured information from the "
    "resume text exactly as it appears. Do not invent information. If a field "
    "is not present, use null or an empty list as appropriate."
)


class LLMParserUnavailable(Exception):
    pass


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _call_chat_completions(resume_text: str):
    client = OpenAI(api_key=settings.openai_api_key)

    return client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Resume text:\n\n{resume_text[:15000]}"},
        ],
        response_format={"type": "json_schema", "json_schema": RESUME_JSON_SCHEMA},
        temperature=0,
    )


def parse_resume_with_llm(resume_text: str) -> dict:
    if not settings.openai_api_key:
        raise LLMParserUnavailable("OPENAI_API_KEY is not configured")

    response = _call_chat_completions(resume_text)
    content = response.choices[0].message.content
    return json.loads(content)
