"""Curated learning-resource catalog for Module 8.

Deterministic skill/certification -> resources mapping. Keeping this as real
curated data (rather than letting an LLM invent course names/URLs) is what keeps
recommendations trustworthy. In the integrated version this becomes a
`learning_resources` DB table seeded from here and retrieved via pgvector.
"""
from __future__ import annotations

# skill (lowercased) -> list of resource dicts
SKILL_RESOURCES: dict[str, list[dict]] = {
    "python": [
        {"title": "Python for Everybody", "provider": "Coursera / U. Michigan", "resource_type": "course", "url": "https://www.coursera.org/specializations/python"},
        {"title": "Real Python Tutorials", "provider": "Real Python", "resource_type": "reading", "url": "https://realpython.com"},
    ],
    "fastapi": [
        {"title": "FastAPI Official Tutorial", "provider": "FastAPI Docs", "resource_type": "course", "url": "https://fastapi.tiangolo.com/tutorial/"},
        {"title": "Building Data Science Applications with FastAPI", "provider": "Packt", "resource_type": "reading", "url": None},
    ],
    "postgresql": [
        {"title": "PostgreSQL for Everybody", "provider": "Coursera", "resource_type": "course", "url": "https://www.coursera.org/specializations/postgresql-for-everybody"},
        {"title": "PostgreSQL Exercises", "provider": "pgexercises.com", "resource_type": "practice", "url": "https://pgexercises.com"},
    ],
    "sql": [
        {"title": "SQL for Data Science", "provider": "Coursera / UC Davis", "resource_type": "course", "url": "https://www.coursera.org/learn/sql-for-data-science"},
    ],
    "docker": [
        {"title": "Docker Mastery", "provider": "Udemy", "resource_type": "course", "url": None},
        {"title": "Docker Official Getting Started", "provider": "Docker Docs", "resource_type": "reading", "url": "https://docs.docker.com/get-started/"},
    ],
    "kubernetes": [
        {"title": "Kubernetes for the Absolute Beginners", "provider": "KodeKloud", "resource_type": "course", "url": None},
        {"title": "Certified Kubernetes Administrator (CKA)", "provider": "CNCF", "resource_type": "certification", "url": "https://www.cncf.io/certification/cka/"},
    ],
    "aws": [
        {"title": "AWS Cloud Practitioner Essentials", "provider": "AWS Skill Builder", "resource_type": "course", "url": "https://aws.amazon.com/training/"},
        {"title": "AWS Certified Solutions Architect – Associate", "provider": "AWS", "resource_type": "certification", "url": "https://aws.amazon.com/certification/certified-solutions-architect-associate/"},
    ],
    "react": [
        {"title": "React Official Tutorial", "provider": "react.dev", "resource_type": "course", "url": "https://react.dev/learn"},
        {"title": "Epic React", "provider": "Kent C. Dodds", "resource_type": "course", "url": None},
    ],
    "react.js": [
        {"title": "React Official Tutorial", "provider": "react.dev", "resource_type": "course", "url": "https://react.dev/learn"},
    ],
    "typescript": [
        {"title": "TypeScript Handbook", "provider": "typescriptlang.org", "resource_type": "reading", "url": "https://www.typescriptlang.org/docs/handbook/"},
    ],
    "machine learning": [
        {"title": "Machine Learning Specialization", "provider": "Coursera / DeepLearning.AI", "resource_type": "course", "url": "https://www.coursera.org/specializations/machine-learning-introduction"},
    ],
    "nlp": [
        {"title": "Natural Language Processing Specialization", "provider": "Coursera / DeepLearning.AI", "resource_type": "course", "url": "https://www.coursera.org/specializations/natural-language-processing"},
    ],
    "leadership": [
        {"title": "Leading People and Teams", "provider": "Coursera / U. Michigan", "resource_type": "course", "url": "https://www.coursera.org/specializations/leading-teams"},
    ],
    "project management": [
        {"title": "Google Project Management Certificate", "provider": "Coursera / Google", "resource_type": "certification", "url": "https://www.coursera.org/professional-certificates/google-project-management"},
    ],
    "agile": [
        {"title": "Agile with Atlassian Jira", "provider": "Coursera", "resource_type": "course", "url": None},
    ],
}

# certification (lowercased) -> resource dict
CERTIFICATION_RESOURCES: dict[str, dict] = {
    "aws certified": {"title": "AWS Certified Solutions Architect – Associate", "provider": "AWS", "resource_type": "certification", "url": "https://aws.amazon.com/certification/"},
    "aws certified developer": {"title": "AWS Certified Developer – Associate", "provider": "AWS", "resource_type": "certification", "url": "https://aws.amazon.com/certification/certified-developer-associate/"},
    "scrum master": {"title": "Professional Scrum Master I (PSM I)", "provider": "Scrum.org", "resource_type": "certification", "url": "https://www.scrum.org/professional-scrum-master-i-certification"},
    "csm": {"title": "Certified ScrumMaster (CSM)", "provider": "Scrum Alliance", "resource_type": "certification", "url": "https://www.scrumalliance.org/"},
    "pmp": {"title": "Project Management Professional (PMP)", "provider": "PMI", "resource_type": "certification", "url": "https://www.pmi.org/certifications/project-management-pmp"},
    "cka": {"title": "Certified Kubernetes Administrator (CKA)", "provider": "CNCF", "resource_type": "certification", "url": "https://www.cncf.io/certification/cka/"},
    "cpa": {"title": "Certified Public Accountant (CPA)", "provider": "AICPA", "resource_type": "certification", "url": None},
    "cissp": {"title": "CISSP", "provider": "ISC2", "resource_type": "certification", "url": "https://www.isc2.org/certifications/cissp"},
}


def resources_for_skill(skill: str) -> list[dict]:
    return SKILL_RESOURCES.get(skill.strip().lower(), [])


def resource_for_certification(cert: str) -> dict | None:
    key = cert.strip().lower()
    if key in CERTIFICATION_RESOURCES:
        return CERTIFICATION_RESOURCES[key]
    # partial match (e.g. "aws certified developer" -> "aws certified")
    for cat_key, res in CERTIFICATION_RESOURCES.items():
        if cat_key in key or key in cat_key:
            return res
    return None
