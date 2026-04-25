"""Generate a branded PDF evaluation report from structured JSON."""
import os
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

TEMPLATES_DIR = Path(__file__).parent.parent.parent / "templates"


def render_evaluation_html(evaluation_data: dict, interview_data: dict) -> str:
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=True)
    template = env.get_template("evaluation_report.html")
    return template.render(eval=evaluation_data, interview=interview_data)


def generate_pdf_bytes(evaluation_data: dict, interview_data: dict) -> bytes:
    from weasyprint import HTML

    html_content = render_evaluation_html(evaluation_data, interview_data)
    pdf_bytes = HTML(string=html_content).write_pdf()
    return pdf_bytes
