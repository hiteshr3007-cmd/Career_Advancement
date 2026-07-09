import re

SECTION_HEADERS = {
    "skills": ["skills", "technical skills", "core competencies", "key skills"],
    "education": ["education", "academic background", "qualifications"],
    "experience": ["experience", "work experience", "employment history", "professional experience"],
    "certifications": ["certifications", "certificates", "licenses"],
    "projects": ["projects", "personal projects", "academic projects"],
    "achievements": ["achievements", "awards", "honors"],
}

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(\+?\d{1,3}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}")
LINKEDIN_RE = re.compile(r"(https?://)?(www\.)?linkedin\.com/[A-Za-z0-9_/-]+", re.IGNORECASE)
GITHUB_RE = re.compile(r"(https?://)?(www\.)?github\.com/[A-Za-z0-9_/-]+", re.IGNORECASE)
DATE_RANGE_RE = re.compile(
    r"(?P<start>[A-Za-z]{3,9}\.?\s?\d{4}|\d{4})\s*[-–—to]{1,4}\s*(?P<end>[A-Za-z]{3,9}\.?\s?\d{4}|\d{4}|present|current)",
    re.IGNORECASE,
)

KNOWN_SKILLS = [
    "python", "java", "javascript", "typescript", "react", "react.js", "next.js", "node.js",
    "fastapi", "django", "flask", "sql", "postgresql", "mysql", "mongodb", "aws", "azure",
    "gcp", "docker", "kubernetes", "terraform", "git", "ci/cd", "html", "css", "tailwind css",
    "machine learning", "deep learning", "nlp", "langchain", "openai", "pandas", "numpy",
    "tensorflow", "pytorch", "excel", "power bi", "tableau", "salesforce", "sap", "communication",
    "leadership", "project management", "agile", "scrum", "recruitment", "talent acquisition",
    "hr operations", "financial analysis", "accounting", "digital marketing", "seo", "sales",
]

KNOWN_CERTIFICATIONS = [
    "pmp", "aws certified", "azure certified", "scrum master", "csm", "cpa", "shrm-cp",
    "google analytics", "six sigma", "itil", "comptia", "cissp", "ceh",
]


def _find_sections(text: str) -> dict[str, str]:
    lines = text.splitlines()
    normalized = [line.strip() for line in lines]

    header_positions: list[tuple[int, str]] = []
    for idx, line in enumerate(normalized):
        clean = line.lower().strip(":#- ")
        if not clean or len(clean) > 40:
            continue
        for section, aliases in SECTION_HEADERS.items():
            if clean in aliases:
                header_positions.append((idx, section))
                break

    header_positions.sort()
    sections: dict[str, str] = {}
    for i, (start_idx, section) in enumerate(header_positions):
        end_idx = header_positions[i + 1][0] if i + 1 < len(header_positions) else len(normalized)
        sections[section] = "\n".join(normalized[start_idx + 1:end_idx]).strip()
    return sections


def _extract_name(text: str, email: str | None) -> str | None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines[:5]:
        if email and email in line:
            continue
        if EMAIL_RE.search(line) or PHONE_RE.search(line):
            continue
        word_count = len(line.split())
        if 1 <= word_count <= 5 and line.replace(" ", "").isalpha():
            return line.title()
    return None


def _extract_skills(text: str, skills_section: str | None) -> list[str]:
    haystack = (skills_section or text).lower()
    found = []
    for skill in KNOWN_SKILLS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, haystack):
            found.append(skill)
    return sorted(set(found))


def _extract_certifications(text: str, cert_section: str | None) -> list[str]:
    haystack = (cert_section or text).lower()
    found = [cert for cert in KNOWN_CERTIFICATIONS if cert in haystack]
    return sorted(set(found))


def _extract_experience_entries(experience_section: str | None) -> list[dict]:
    if not experience_section:
        return []
    entries = []
    blocks = re.split(r"\n\s*\n", experience_section)
    for block in blocks:
        match = DATE_RANGE_RE.search(block)
        if not match:
            continue
        first_line = block.strip().splitlines()[0] if block.strip() else ""
        entries.append(
            {
                "title_line": first_line.strip(),
                "start_raw": match.group("start"),
                "end_raw": match.group("end"),
                "is_current": match.group("end").lower() in {"present", "current"},
                "description": block.strip(),
            }
        )
    return entries


def _extract_education_entries(education_section: str | None) -> list[dict]:
    if not education_section:
        return []
    entries = []
    blocks = re.split(r"\n\s*\n", education_section)
    degree_keywords = ["bachelor", "master", "b.tech", "m.tech", "phd", "b.sc", "m.sc", "mba", "diploma"]
    for block in blocks:
        lower = block.lower()
        if any(keyword in lower for keyword in degree_keywords) or DATE_RANGE_RE.search(block):
            entries.append({"raw_text": block.strip()})
    return entries


def parse_resume_with_rules(text: str) -> tuple[dict, float]:
    """Best-effort regex/keyword based resume parsing.

    Returns (structured_data, confidence) where confidence in [0, 1] estimates
    how complete/reliable the extraction is, used to decide on an LLM fallback.
    """
    sections = _find_sections(text)

    email_match = EMAIL_RE.search(text)
    phone_match = PHONE_RE.search(text)
    linkedin_match = LINKEDIN_RE.search(text)
    github_match = GITHUB_RE.search(text)
    email = email_match.group(0) if email_match else None

    skills = _extract_skills(text, sections.get("skills"))
    certifications = _extract_certifications(text, sections.get("certifications"))
    experience_entries = _extract_experience_entries(sections.get("experience"))
    education_entries = _extract_education_entries(sections.get("education"))

    data = {
        "personal_info": {
            "name": _extract_name(text, email),
            "email": email,
            "phone": phone_match.group(0).strip() if phone_match else None,
            "linkedin": linkedin_match.group(0) if linkedin_match else None,
            "github": github_match.group(0) if github_match else None,
            "location": None,
        },
        "skills": skills,
        "certifications": certifications,
        "education": education_entries,
        "experience": experience_entries,
        "projects": [],
        "achievements": [],
        "keywords": skills,
        "industry_classification": None,
        "summary": None,
    }

    signals = [
        bool(data["personal_info"]["name"]),
        bool(data["personal_info"]["email"]),
        len(skills) >= 3,
        len(experience_entries) >= 1,
        len(education_entries) >= 1,
    ]
    confidence = sum(1 for s in signals if s) / len(signals)

    return data, confidence
