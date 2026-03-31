import asyncio
import smtplib
import ssl
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from src.config.environments import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM

logger = logging.getLogger(__name__)


def _build_membership_email(to_email: str, username: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "🎉 K-PAI 정회원이 되신 것을 축하드립니다!"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email

    plain = f"""\
안녕하세요 {username}님,

K-PAI 포럼에 2회 이상 참석하셨습니다!
이제 K-PAI 정회원 자격이 부여되었습니다.

정회원으로서 더 많은 혜택과 네트워킹 기회를 누리세요.
자세한 내용: https://k-privateai.github.io/membership/

감사합니다,
K-PAI 운영팀
"""

    html = f"""\
<html><body>
<p>안녕하세요 <strong>{username}</strong>님,</p>
<p>K-PAI 포럼에 <strong>2회 이상</strong> 참석하셨습니다!<br>
이제 <strong>K-PAI 정회원</strong> 자격이 부여되었습니다.</p>
<p>정회원으로서 더 많은 혜택과 네트워킹 기회를 누리세요.<br>
자세한 내용: <a href="https://k-privateai.github.io/membership/">K-PAI Membership</a></p>
<p>감사합니다,<br>K-PAI 운영팀</p>
</body></html>
"""

    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))
    return msg


def _send_sync(to_email: str, username: str) -> None:
    msg = _build_membership_email(to_email, username)

    if SMTP_PORT == 465:
        # Implicit SSL (Gmail 등)
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
    elif SMTP_USER:
        # STARTTLS + 인증 (포트 587, Ethereal·Outlook 등)
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
    else:
        # Plain SMTP, 인증 없음 (Mailhog 등 로컬 개발용)
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.sendmail(SMTP_FROM, to_email, msg.as_string())


async def send_membership_email(to_email: str, username: str) -> None:
    """
    Sends a K-PAI membership congratulation email.
    If SMTP_HOST is not configured, logs and skips silently.
    """
    if not SMTP_HOST:
        logger.info("SMTP not configured — skipping membership email to %s", to_email)
        return

    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, _send_sync, to_email, username)
        logger.info("Membership email sent to %s", to_email)
    except Exception as exc:
        logger.error("Failed to send membership email to %s: %s", to_email, exc)
