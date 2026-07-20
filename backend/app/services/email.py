"""Outgoing email — currently just the password-reset link.

SMTP is optional (see app/config.py): with no SMTP_HOST configured, the
message is logged instead of sent, so local dev can complete the reset flow
by copying the link out of the server log without needing a real mailbox.
Uses the stdlib smtplib/email modules rather than a vendor SDK, so any
standard SMTP server works (Gmail, SES, SendGrid, Mailtrap, ...) with no
extra dependency.
"""
import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)


def _send(to_email: str, subject: str, body: str) -> None:
    if not settings.smtp_host:
        logger.warning(
            "SMTP not configured — logging email instead of sending.\nTo: %s\nSubject: %s\n%s",
            to_email,
            subject,
            body,
        )
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password or "")
            server.send_message(message)
    except (OSError, smtplib.SMTPException):
        # Never let an unreachable/misconfigured mail server break the caller
        # (e.g. the password-reset request should still respond normally, per
        # its anti-enumeration contract) — log it instead.
        logger.exception("Failed to send email to %s", to_email)


def send_password_reset_email(to_email: str, full_name: str, token: str) -> None:
    reset_link = f"{settings.frontend_base_url}/reset-password?token={token}"
    subject = "Reset your Career Advancement password"
    body = (
        f"Hi {full_name},\n\n"
        "We received a request to reset your Career Advancement password. "
        "This link expires in 1 hour:\n\n"
        f"{reset_link}\n\n"
        "If you didn't request this, you can safely ignore this email."
    )
    _send(to_email, subject, body)
