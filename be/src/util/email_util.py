import asyncio
import smtplib
import ssl
import logging
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

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
    _deliver(SMTP_FROM, to_email, msg.as_string())


_KST = timezone(timedelta(hours=9))


def _fmt_dt(dt: Optional[datetime]) -> str:
    if dt is None:
        return "미정"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(_KST).strftime("%Y년 %m월 %d일 %H:%M (KST)")


def _build_reminder_email(
    to_email: str,
    username: str,
    title: str,
    description: Optional[str],
    start_time: Optional[datetime],
    end_time: Optional[datetime],
    location: Optional[str],
    host: Optional[str],
    cover_image: Optional[str],
) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"📅 [{title}] 세미나 참석 안내"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email

    # ── Plain text fallback ────────────────────────────────────────────────
    plain_lines = [
        f"안녕하세요 {username}님,",
        "",
        f"K-PAI 세미나 '{title}'에 RSVP 하셨습니다.",
        "",
    ]
    if host:
        plain_lines.append(f"호스트: {host}")
    if start_time:
        plain_lines.append(f"시작: {_fmt_dt(start_time)}")
    if end_time:
        plain_lines.append(f"종료: {_fmt_dt(end_time)}")
    if location:
        plain_lines.append(f"장소: {location}")
    if description:
        plain_lines += ["", description]
    plain_lines += ["", "감사합니다,", "K-PAI 운영팀"]
    plain = "\n".join(plain_lines)

    # ── HTML ──────────────────────────────────────────────────────────────
    cover_block = (
        f'<img src="{cover_image}" alt="cover" style="width:100%;max-height:260px;'
        f'object-fit:cover;display:block;border-radius:12px 12px 0 0;">'
        if cover_image else ""
    )
    host_block = (
        f'<tr><td style="padding:6px 0;color:#888;font-size:13px;width:90px">🎙 호스트</td>'
        f'<td style="padding:6px 0;font-size:14px;font-weight:600">{host}</td></tr>'
        if host else ""
    )
    time_block = (
        f'<tr><td style="padding:6px 0;color:#888;font-size:13px">📅 시작</td>'
        f'<td style="padding:6px 0;font-size:14px">{_fmt_dt(start_time)}</td></tr>'
        if start_time else ""
    )
    end_block = (
        f'<tr><td style="padding:6px 0;color:#888;font-size:13px">🏁 종료</td>'
        f'<td style="padding:6px 0;font-size:14px">{_fmt_dt(end_time)}</td></tr>'
        if end_time else ""
    )
    location_block = (
        f'<tr><td style="padding:6px 0;color:#888;font-size:13px">📍 장소</td>'
        f'<td style="padding:6px 0;font-size:14px">{location}</td></tr>'
        if location else ""
    )
    desc_block = (
        f'<p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#444;">'
        f'{description.replace(chr(10), "<br>")}</p>'
        if description else ""
    )

    html = f"""\
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;
                    box-shadow:0 4px 24px rgba(0,0,0,0.10);overflow:hidden;">

        <!-- Cover image -->
        <tr><td>{cover_block}</td></tr>

        <!-- Header bar -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e 0%,#6c5ce7 100%);
                     padding:28px 36px;">
            <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;
                      text-transform:uppercase;color:#c8b8ff;">K-PAI Forum</p>
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;
                       line-height:1.3;">{title}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 24px;font-size:15px;color:#333;">
              안녕하세요 <strong>{username}</strong>님,<br>
              아래 세미나에 RSVP 하셨습니다. 일정을 확인해 주세요!
            </p>

            <!-- Info table -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f8f6ff;border-radius:8px;padding:16px 20px;
                          border-left:4px solid #6c5ce7;">
              <tr><td>
                <table width="100%" cellpadding="0" cellspacing="0">
                  {host_block}
                  {time_block}
                  {end_block}
                  {location_block}
                </table>
              </td></tr>
            </table>

            {desc_block}

            <!-- CTA button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
              <tr>
                <td align="center">
                  <a href="https://k-privateai.github.io"
                     style="display:inline-block;padding:14px 36px;
                            background:linear-gradient(135deg,#6c5ce7,#a29bfe);
                            color:#fff;text-decoration:none;border-radius:50px;
                            font-size:15px;font-weight:600;
                            box-shadow:0 4px 14px rgba(108,92,231,0.4);">
                    K-PAI 홈페이지 방문하기 →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f6ff;padding:20px 36px;border-top:1px solid #e8e4f8;">
            <p style="margin:0;font-size:12px;color:#999;text-align:center;line-height:1.6;">
              본 메일은 K-PAI 세미나 RSVP 확인 메일입니다.<br>
              문의: <a href="mailto:contact@k-pai.org" style="color:#6c5ce7;">contact@k-pai.org</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))
    return msg


def _send_reminder_sync(
    to_email: str,
    username: str,
    title: str,
    description: Optional[str],
    start_time: Optional[datetime],
    end_time: Optional[datetime],
    location: Optional[str],
    host: Optional[str],
    cover_image: Optional[str],
) -> None:
    msg = _build_reminder_email(
        to_email, username, title, description, start_time, end_time, location, host, cover_image
    )
    _deliver(SMTP_FROM, to_email, msg.as_string())


def _deliver(from_addr: str, to_addr: str, raw: str) -> None:
    """Low-level SMTP delivery, shared by all email types."""
    if SMTP_PORT == 465:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as s:
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.sendmail(from_addr, to_addr, raw)
    elif SMTP_USER:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.ehlo(); s.starttls(context=context); s.ehlo()
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.sendmail(from_addr, to_addr, raw)
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.sendmail(from_addr, to_addr, raw)


async def send_reminder_email(
    to_email: str,
    username: str,
    title: str,
    description: Optional[str],
    start_time: Optional[datetime],
    end_time: Optional[datetime],
    location: Optional[str],
    host: Optional[str],
    cover_image: Optional[str],
) -> None:
    """Send a seminar reminder email to a single RSVP'd attendee."""
    if not SMTP_HOST:
        logger.info("SMTP not configured — skipping reminder to %s", to_email)
        return
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(
            None, _send_reminder_sync,
            to_email, username, title, description,
            start_time, end_time, location, host, cover_image,
        )
        logger.info("Reminder sent to %s", to_email)
    except Exception as exc:
        logger.error("Failed to send reminder to %s: %s", to_email, exc)
        raise


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
