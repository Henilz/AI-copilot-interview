"""Evaluation PDF storage — S3 when AWS keys are configured, local disk otherwise."""
import logging
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)


def _s3_configured() -> bool:
    return bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY)


def get_s3_client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
    )


def upload_pdf(pdf_bytes: bytes, s3_key: str) -> str:
    client = get_s3_client()
    client.put_object(
        Bucket=settings.AWS_BUCKET_NAME,
        Key=s3_key,
        Body=pdf_bytes,
        ContentType="application/pdf",
    )
    logger.info("PDF uploaded to s3://%s/%s", settings.AWS_BUCKET_NAME, s3_key)
    return s3_key


def generate_presigned_url(s3_key: str, expiry_seconds: int = 86400) -> str:
    client = get_s3_client()
    try:
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.AWS_BUCKET_NAME, "Key": s3_key},
            ExpiresIn=expiry_seconds,
        )
    except ClientError as exc:
        logger.error("Failed to generate pre-signed URL: %s", exc)
        raise


def _write_local_pdf(pdf_bytes: bytes, key: str) -> str:
    base = Path(settings.LOCAL_REPORTS_DIR).resolve()
    target = (base / key).resolve()
    target.relative_to(base)  # guards against `..` traversal
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(pdf_bytes)
    logger.info("PDF written to %s", target)
    return f"{settings.API_PUBLIC_URL.rstrip('/')}/api/evaluations/files/{key}"


def store_pdf_report(pdf_bytes: bytes, key: str) -> str:
    """Persist an evaluation PDF and return a URL the frontend can open."""
    if _s3_configured():
        upload_pdf(pdf_bytes, key)
        return generate_presigned_url(key, expiry_seconds=86400)
    return _write_local_pdf(pdf_bytes, key)
