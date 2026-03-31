import csv
import io
import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.model.user import User, UserRole
from src.model.seminar import Seminar
from src.model.seminar_rsvp import SeminarRSVP
from src.util.email_util import send_membership_email

logger = logging.getLogger(__name__)


class ImportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def import_csv(self, seminar_id: int, csv_content: str) -> dict:
        # Verify seminar exists
        seminar_result = await self.db.execute(
            select(Seminar).where(Seminar.id == seminar_id)
        )
        seminar = seminar_result.scalar_one_or_none()
        if seminar is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Seminar not found",
            )

        reader = csv.DictReader(io.StringIO(csv_content))

        results = {
            "total": 0,
            "matched_regular": 0,    # existing users with password
            "matched_temporary": 0,  # existing temp users (imported before)
            "created_temporary": 0,  # new temp users created now
            "rsvp_created": 0,
            "rsvp_skipped": 0,       # already had RSVP for this seminar
            "membership_emails_sent": 0,
            "errors": [],
        }

        # Collect users who become newly checked-in this import (for membership check)
        newly_checked_in: list[User] = []

        for row in reader:
            results["total"] += 1
            try:
                email = (row.get("email") or "").strip().lower()
                name = (row.get("name") or "").strip()
                first_name = (row.get("first_name") or "").strip()
                last_name = (row.get("last_name") or "").strip()
                checked_in_at_str = (row.get("checked_in_at") or "").strip()

                if not email:
                    results["errors"].append(
                        f"Row {results['total']}: email is empty — skipped"
                    )
                    continue

                # Derive display name
                username = name or f"{first_name} {last_name}".strip() or email

                # ── Find or create user ──────────────────────────────────────
                user_result = await self.db.execute(
                    select(User).where(User.email == email)
                )
                user = user_result.scalar_one_or_none()

                if user is None:
                    # New temp user — no password
                    user = User(
                        email=email,
                        username=username,
                        password=None,
                        is_temporary=True,
                        role=UserRole.MEMBER,
                    )
                    self.db.add(user)
                    await self.db.flush()   # get user.id without full commit
                    results["created_temporary"] += 1
                elif user.is_temporary:
                    results["matched_temporary"] += 1
                else:
                    results["matched_regular"] += 1

                # ── Create RSVP if not already present ───────────────────────
                rsvp_result = await self.db.execute(
                    select(SeminarRSVP).where(
                        SeminarRSVP.user_id == user.id,
                        SeminarRSVP.seminar_id == seminar_id,
                    )
                )
                existing_rsvp = rsvp_result.scalar_one_or_none()

                if existing_rsvp is not None:
                    results["rsvp_skipped"] += 1
                    continue

                # Parse checked_in_at
                checked_in = False
                checked_in_at = None
                if checked_in_at_str:
                    try:
                        dt = datetime.fromisoformat(
                            checked_in_at_str.replace("Z", "+00:00")
                        )
                        checked_in_at = dt.astimezone(timezone.utc).replace(tzinfo=None)
                        checked_in = True
                    except ValueError:
                        logger.warning(
                            "Row %d: could not parse checked_in_at '%s'",
                            results["total"],
                            checked_in_at_str,
                        )

                rsvp = SeminarRSVP(
                    user_id=user.id,
                    seminar_id=seminar_id,
                    checked_in=checked_in,
                    checked_in_at=checked_in_at,
                )
                self.db.add(rsvp)
                results["rsvp_created"] += 1

                if checked_in:
                    newly_checked_in.append(user)

            except Exception as exc:
                results["errors"].append(
                    f"Row {results['total']}: {exc}"
                )

        await self.db.commit()

        # ── Membership check — send email if user just reached 2 check-ins ──
        for user in newly_checked_in:
            if user.full_member_email_sent:
                continue

            count_result = await self.db.execute(
                select(func.count(SeminarRSVP.id)).where(
                    SeminarRSVP.user_id == user.id,
                    SeminarRSVP.checked_in.is_(True),
                )
            )
            total_checkins: int = count_result.scalar_one()
            if total_checkins >= 2:
                await send_membership_email(user.email, user.username)
                user.full_member_email_sent = True
                results["membership_emails_sent"] += 1

        await self.db.commit()

        return results
