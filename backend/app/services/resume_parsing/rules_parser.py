import re
from datetime import date

SECTION_HEADERS = {
    "skills": ["skills", "technical skills", "core competencies", "key skills"],
    "education": ["education", "academic background", "qualifications"],
    "experience": ["experience", "work experience", "employment history", "professional experience"],
    "certifications": ["certifications", "certificates", "licenses"],
    "projects": ["projects", "personal projects", "academic projects"],
    "achievements": ["achievements", "awards", "honors"],
}

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
# BK-3: match either an international number (leading +, e.g. +44 20 7946 0958,
# +971 50 123 4567) OR a number with >=3 digit groups (e.g. 555-123-4567,
# (555) 123-4567). Requiring +/3-groups avoids matching 2-group year ranges
# like "2016 - 2020". Candidates are then validated by digit count (E.164: 8-15).
PHONE_RE = re.compile(
    r"(?:\+\d[\d\s().\-]{6,}\d)"
    r"|(?:\(?\d{2,4}\)?[\s.\-]\d{2,4}[\s.\-]\d{2,4}(?:[\s.\-]\d{2,4})?)"
)


def _extract_phone(text: str) -> str | None:
    for match in PHONE_RE.finditer(text):
        raw = match.group(0).strip()
        digits = re.sub(r"\D", "", raw)
        if 8 <= len(digits) <= 15:
            return raw
    return None
LINKEDIN_RE = re.compile(r"(https?://)?(www\.)?linkedin\.com/[A-Za-z0-9_/-]+", re.IGNORECASE)
GITHUB_RE = re.compile(r"(https?://)?(www\.)?github\.com/[A-Za-z0-9_/-]+", re.IGNORECASE)
DATE_RANGE_RE = re.compile(
    # [ \t]? (not \s?) between a month name and its year: \s also matches
    # newlines, which let this greedily bleed into the previous line — e.g.
    # matching "Inc\n2018" as the start of "...Beta Inc\n2018 - 2020" instead
    # of just "2018". See DQ-1 in QA_TESTING_GUIDE.pdf.
    r"(?P<start>[A-Za-z]{3,9}\.?[ \t]?\d{4}|\d{4})\s*[-–—to]{1,4}\s*"
    r"(?P<end>[A-Za-z]{3,9}\.?[ \t]?\d{4}|\d{4}|present|current)",
    re.IGNORECASE,
)
TITLE_AT_COMPANY_RE = re.compile(r"^(?P<title>.+?)\s+at\s+(?P<company>.+)$", re.IGNORECASE)

MONTH_ABBR = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}
_MONTH_YEAR_RE = re.compile(r"([A-Za-z]{3,9})\.?\s?(\d{4})")


def parse_resume_date(raw: str | None) -> date | None:
    """Best-effort parse of a DATE_RANGE_RE start/end capture ("Jan 2020",
    "January 2020", or a bare "2020") into a date. Returns None for anything
    else, including "present"/"current" (callers derive is_current from the
    raw string directly, not from this).

    DQ-1: without this, CandidateExperience.start_date/end_date were never
    populated from resume text, so recompute_total_experience_years had
    nothing to compute a duration from and total_experience_years silently
    stayed 0.0 after a resume upload — not a bug in the recompute itself, but
    in never feeding it real dates. See QA_TESTING_GUIDE.pdf.
    """
    if not raw:
        return None
    raw = raw.strip().rstrip(".")
    if raw.lower() in {"present", "current"}:
        return None
    if re.fullmatch(r"\d{4}", raw):
        return date(int(raw), 1, 1)
    match = _MONTH_YEAR_RE.match(raw)
    if match:
        month = MONTH_ABBR.get(match.group(1).lower()[:3])
        if month:
            return date(int(match.group(2)), month, 1)
    return None

KNOWN_SKILLS = [
    # Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "golang", "rust",
    "ruby", "scala", "kotlin", "swift", "objective-c", "php", "r", "matlab", "perl",
    "dart", "elixir", "haskell", "bash", "powershell", "sql",
    # Web / frontend
    "react", "react.js", "react native", "next.js", "node.js", "vue", "vue.js", "angular",
    "svelte", "html", "css", "tailwind css", "redux", "jquery",
    # Mobile
    "ios", "android", "flutter", "xamarin",
    # Backend frameworks
    "fastapi", "django", "flask", "express", "express.js", "nestjs", "spring", "spring boot",
    ".net", "asp.net", "laravel", "rails", "ruby on rails", "graphql", "rest api", "grpc",
    "microservices", "websockets",
    # Databases
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb",
    "oracle", "sqlite", "mariadb", "neo4j", "snowflake", "redshift", "bigquery",
    # Cloud / DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible", "helm", "jenkins",
    "gitlab ci", "github actions", "circleci", "argocd", "prometheus", "grafana",
    "cloudformation", "git", "ci/cd", "linux",
    # Data / big data
    "spark", "apache spark", "hadoop", "kafka", "hive", "airflow", "databricks", "dbt", "etl",
    "pandas", "numpy", "excel", "power bi", "tableau", "looker",
    # ML / AI
    "machine learning", "deep learning", "nlp", "computer vision", "langchain", "openai",
    "tensorflow", "pytorch", "keras", "scikit-learn", "hugging face", "opencv", "spacy",
    "xgboost", "llm", "generative ai",
    # Testing
    "pytest", "jest", "selenium", "cypress", "junit",
    # Messaging / infra
    "rabbitmq", "mqtt",
    # Enterprise / business
    "salesforce", "sap", "communication", "leadership", "project management", "agile",
    "scrum", "recruitment", "talent acquisition", "hr operations", "financial analysis",
    "accounting", "digital marketing", "seo", "sales",
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
        # Bound on alphanumerics only (not +/#/./-), so "c++", "c#", ".net" and
        # "node.js" match, while "java" still doesn't match inside "javascript".
        pattern = r"(?<![a-z0-9])" + re.escape(skill) + r"(?![a-z0-9])"
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
        first_line = block.strip().splitlines()[0].strip() if block.strip() else ""

        title = first_line
        company = None
        title_company_match = TITLE_AT_COMPANY_RE.match(first_line)
        if title_company_match:
            title = title_company_match.group("title").strip()
            company = title_company_match.group("company").strip()

        entries.append(
            {
                "title": title,
                "company": company,
                "title_line": first_line,
                "start_raw": match.group("start"),
                "end_raw": match.group("end"),
                "is_current": match.group("end").lower() in {"present", "current"},
                "description": block.strip(),
            }
        )
    return entries


DEGREE_KEYWORDS = ["bachelor", "master", "b.tech", "m.tech", "phd", "b.sc", "m.sc", "mba", "diploma"]
INSTITUTION_KEYWORDS = ["university", "institute", "college", "school"]
FIELD_OF_STUDY_RE = re.compile(r"\bin\s+(.+)", re.IGNORECASE)


def _extract_education_entries(education_section: str | None) -> list[dict]:
    if not education_section:
        return []
    entries = []
    blocks = re.split(r"\n\s*\n", education_section)
    for block in blocks:
        lower = block.lower()
        if not (any(keyword in lower for keyword in DEGREE_KEYWORDS) or DATE_RANGE_RE.search(block)):
            continue

        degree = None
        field_of_study = None
        institution = None
        for line in (l.strip() for l in block.strip().splitlines() if l.strip()):
            line_lower = line.lower()
            if degree is None and any(keyword in line_lower for keyword in DEGREE_KEYWORDS):
                degree = line
                match = FIELD_OF_STUDY_RE.search(line)
                if match:
                    field_of_study = match.group(1).strip()
            elif institution is None and any(keyword in line_lower for keyword in INSTITUTION_KEYWORDS):
                institution = line

        entries.append({
            "degree": degree,
            "field_of_study": field_of_study,
            "institution": institution,
            "raw_text": block.strip(),
        })
    return entries


def parse_resume_with_rules(text: str) -> tuple[dict, float]:
    """Best-effort regex/keyword based resume parsing.

    Returns (structured_data, confidence) where confidence in [0, 1] estimates
    how complete/reliable the extraction is, used to decide on an LLM fallback.
    """
    sections = _find_sections(text)

    email_match = EMAIL_RE.search(text)
    phone = _extract_phone(text)
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
            "phone": phone,
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
