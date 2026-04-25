import io
import logging

import pdfplumber
from docx import Document

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
    return "\n".join(paragraphs)


def extract_text(file_bytes: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        text = extract_text_from_pdf(file_bytes)
        if len(text.strip()) < 50:
            # Scanned PDF — attempt OCR fallback
            try:
                text = _ocr_fallback(file_bytes)
            except Exception as exc:
                logger.warning("OCR fallback failed: %s", exc)
        return text
    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return extract_text_from_docx(file_bytes)
    else:
        raise ValueError(f"Unsupported content type: {content_type}")


def _ocr_fallback(file_bytes: bytes) -> str:
    import pytesseract
    from PIL import Image
    import pdf2image  # type: ignore

    pages = pdf2image.convert_from_bytes(file_bytes)
    text_parts = []
    for page in pages:
        text_parts.append(pytesseract.image_to_string(page))
    return "\n".join(text_parts)


def is_text_garbage(text: str) -> bool:
    """Heuristic: if less than 10% of chars are alphanumeric, probably garbage/scanned."""
    if not text:
        return True
    alpha_count = sum(1 for c in text if c.isalnum())
    return (alpha_count / len(text)) < 0.1
