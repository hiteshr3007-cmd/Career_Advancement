import uuid
from datetime import datetime

from app.database import SessionLocal
from app.models.storage import StoredFile

# --- AWS S3 storage (disabled for now, no AWS account/credentials set up yet) ---
# Re-enable by restoring this class as `storage_service` below and providing
# AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_BUCKET in .env.
#
# import boto3
# from botocore.exceptions import ClientError
# from app.config import settings
#
# class S3StorageService:
#     """Thin wrapper around S3 for resume file storage."""
#
#     def __init__(self) -> None:
#         self._client = boto3.client(
#             "s3",
#             region_name=settings.aws_region,
#             aws_access_key_id=settings.aws_access_key_id,
#             aws_secret_access_key=settings.aws_secret_access_key,
#         )
#         self._bucket = settings.aws_s3_bucket
#
#     def build_key(self, candidate_id: uuid.UUID, file_name: str) -> str:
#         safe_name = file_name.replace(" ", "_")
#         stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
#         return f"resumes/{candidate_id}/{stamp}_{uuid.uuid4().hex[:8]}_{safe_name}"
#
#     def upload_fileobj(self, file_obj, key: str, content_type: str) -> None:
#         self._client.upload_fileobj(
#             file_obj, self._bucket, key, ExtraArgs={"ContentType": content_type}
#         )
#
#     def download_bytes(self, key: str) -> bytes:
#         try:
#             response = self._client.get_object(Bucket=self._bucket, Key=key)
#             return response["Body"].read()
#         except ClientError as exc:
#             raise FileNotFoundError(f"Could not fetch object {key} from S3") from exc
#
#     def generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
#         return self._client.generate_presigned_url(
#             "get_object",
#             Params={"Bucket": self._bucket, "Key": key},
#             ExpiresIn=expires_in,
#         )
#
#     def delete(self, key: str) -> None:
#         self._client.delete_object(Bucket=self._bucket, Key=key)


class PostgresStorageService:
    """Stores resume files as blobs in Postgres. Same key-based interface as
    the S3 implementation above, so swapping back later only means restoring
    that class and pointing `storage_service` at it."""

    def build_key(self, candidate_id: uuid.UUID, file_name: str) -> str:
        safe_name = file_name.replace(" ", "_")
        stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        return f"resumes/{candidate_id}/{stamp}_{uuid.uuid4().hex[:8]}_{safe_name}"

    def upload_fileobj(self, file_obj, key: str, content_type: str) -> None:
        data = file_obj.read()
        db = SessionLocal()
        try:
            db.merge(StoredFile(key=key, content_type=content_type, data=data))
            db.commit()
        finally:
            db.close()

    def download_bytes(self, key: str) -> bytes:
        db = SessionLocal()
        try:
            record = db.get(StoredFile, key)
            if not record:
                raise FileNotFoundError(f"No stored file for key {key}")
            return record.data
        finally:
            db.close()

    def get_content_type(self, key: str) -> str:
        db = SessionLocal()
        try:
            record = db.get(StoredFile, key)
            if not record:
                raise FileNotFoundError(f"No stored file for key {key}")
            return record.content_type
        finally:
            db.close()

    def delete(self, key: str) -> None:
        db = SessionLocal()
        try:
            record = db.get(StoredFile, key)
            if record:
                db.delete(record)
                db.commit()
        finally:
            db.close()


storage_service = PostgresStorageService()
