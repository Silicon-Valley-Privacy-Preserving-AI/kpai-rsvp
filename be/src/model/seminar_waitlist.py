from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey, UniqueConstraint, func, DateTime
from datetime import datetime
from src.config.database import Base


class SeminarWaitlist(Base):
    __tablename__ = "seminar_waitlists"
    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    seminar_id: Mapped[int] = mapped_column(ForeignKey("seminars.id", ondelete="CASCADE"))

    __table_args__ = (
        UniqueConstraint("user_id", "seminar_id", name="uq_waitlist_user_seminar"),
    )
