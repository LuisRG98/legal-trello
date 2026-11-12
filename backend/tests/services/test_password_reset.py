
from datetime import datetime, timezone
from types import SimpleNamespace

from app.models.user import User
from app.services import password_reset


def test_generate_temporary_password_is_secure_and_unique():
    first = password_reset.generate_temporary_password()
    second = password_reset.generate_temporary_password()

    assert len(first) >= 24
    assert first != second


def test_prepare_temporary_password_updates_user(
    monkeypatch,
):
    monkeypatch.setattr(
        password_reset,
        "get_settings",
        lambda: SimpleNamespace(
            temporary_password_expire_minutes=30
        ),
    )

    monkeypatch.setattr(
        password_reset,
        "hash_password",
        lambda password: f"hashed:{password}",
    )

    user = User(
        full_name="Test User",
        email="test@example.com",
        nickname="testuser",
        password_hash="old-hash",
        role="SALES",
        is_active=True,
        must_change_password=False,
        token_version=2,
    )

    password_reset.prepare_temporary_password(
        user=user,
        temporary_password="TemporaryPassword123!",
    )

    assert user.password_hash == (
        "hashed:TemporaryPassword123!"
    )

    assert user.must_change_password is True

    assert user.temporary_password_expires_at is not None

    assert user.password_changed_at is not None

    assert user.token_version == 3

    assert (
        user.temporary_password_expires_at
        > datetime.now(timezone.utc)
    )


def test_send_temporary_password_email(
    monkeypatch,
):
    captured = {}

    def fake_send_email(**kwargs):
        captured.update(kwargs)

    monkeypatch.setattr(
        password_reset,
        "get_settings",
        lambda: SimpleNamespace(
            temporary_password_expire_minutes=30
        ),
    )

    monkeypatch.setattr(
        password_reset,
        "send_email",
        fake_send_email,
    )

    password_reset.send_temporary_password_email(
        email="test@example.com",
        full_name="Test User",
        temporary_password="TemporaryPassword123!",
    )

    assert captured["to"] == "test@example.com"

    assert "temporary" in captured["subject"].lower()
    assert "password" in captured["subject"].lower()

    assert "TemporaryPassword123!" in captured["html"]


def test_email_html_escapes_user_content(
    monkeypatch,
):
    captured = {}

    monkeypatch.setattr(
        password_reset,
        "get_settings",
        lambda: SimpleNamespace(
            temporary_password_expire_minutes=30
        ),
    )

    monkeypatch.setattr(
        password_reset,
        "send_email",
        lambda **kwargs: captured.update(kwargs),
    )

    password_reset.send_temporary_password_email(
        email="test@example.com",
        full_name="<script>alert(1)</script>",
        temporary_password="TemporaryPassword123!",
    )

    assert "<script>" not in captured["html"]
    assert "&lt;script&gt;" in captured["html"]
