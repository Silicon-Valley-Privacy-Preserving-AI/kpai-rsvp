from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.config.database import Base
from sqlalchemy import func, DateTime
from datetime import datetime


class Seminar(Base):
    __tablename__ = "seminars"
    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    title: Mapped[str] = mapped_column()
    description: Mapped[str] = mapped_column()
    maximum_rsvp_count: Mapped[int] = mapped_column()

    rsvps = relationship(
        "SeminarRSVP",
        backref="seminar",
        cascade="all, delete-orphan"
    )