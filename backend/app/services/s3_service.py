"""S3 upload and pre-signed URL generation for evaluation PDFs."""
import logging

import boto3
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)


def get_s3_client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
    )


def upload_pdf(pdf_bytes: bytes, s3_key: str) -> str:
    """Upload PDF bytes to S3 and return the S3 key."""
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
    """Generate a pre-signed URL valid for expiry_seconds (default 24h)."""
    client = get_s3_client()
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.AWS_BUCKET_NAME, "Key": s3_key},
            ExpiresIn=expiry_seconds,
        )
        return url
    except ClientError as exc:
        logger.error("Failed to generate pre-signed URL: %s", exc)
        raise
