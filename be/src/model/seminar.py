from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.config.database import Base
from sqlalchemy import func, DateTime, Boolean, String, Integer
from datetime import datetime
from typing import Optional


class Seminar(Base):
    __tablename__ = "seminars"
    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    title: Mapped[str] = mapped_column()
    description: Mapped[Optional[str]] = mapped_column(nullable=True)
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(nullable=True)
    max_capacity: Mapped[Optional[int]] = mapped_column(nullable=True)
    host: Mapped[Optional[str]] = mapped_column(nullable=True)
    cover_image: Mapped[Optional[str]] = mapped_column(nullable=True)
    rsvp_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    waitlist_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    # IANA timezone used when creating the event (e.g. "America/Los_Angeles").
    # Stored so the frontend can display times back in the organiser's intended timezone.
    display_timezone: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    rsvps = relationship(
        "SeminarRSVP",
        backref="seminar",
        cascade="all, delete-orphan"
    )
    waitlist = relationship(
        "SeminarWaitlist",
        backref="seminar",
        cascade="all, delete-orphan",
        order_by="SeminarWaitlist.created_at"
    )
    checkin_tokens = relationship(
        "CheckInToken",
        backref="seminar",
        cascade="all, delete-orphan"
    )
