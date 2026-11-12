import logging

import httpx

from app.core.config import get_settings


logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


class EmailDeliveryError(Exception):
    """Raised when an email cannot be delivered through Resend."""


def send_email(
    *,
    to: str,
    subject: str,
    html: str,
) -> None:
    """Send an HTML email using the Resend API."""

    settings = get_settings()

    if not settings.resend_api_key:
        raise EmailDeliveryError(
            "Email provider is not configured."
        )

    if not settings.email_from:
        raise EmailDeliveryError(
            "Email sender is not configured."
        )

    headers = {
        "Authorization": f"Bearer {settings.resend_api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "from": settings.email_from,
        "to": [to],
        "subject": subject,
        "html": html,
    }

    try:
        response = httpx.post(
            RESEND_API_URL,
            headers=headers,
            json=payload,
            timeout=15.0,
        )

        if response.is_error:
            logger.error(
                "Resend API error | Status: %s | Response: %s",
                response.status_code,
                response.text,
            )

        response.raise_for_status()

        logger.info(
            "Email successfully accepted by Resend."
        )

    except httpx.HTTPError as exc:
        logger.exception(
            "Resend email delivery failed."
        )

        raise EmailDeliveryError(
            "Unable to send the email."
        ) from exc