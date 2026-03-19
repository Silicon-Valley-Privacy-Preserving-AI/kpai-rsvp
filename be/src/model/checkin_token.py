from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey, func, DateTime, String, Boolean
from datetime import datetime
from src.config.database import Base


class CheckInToken(Base):
    __tablename__ = "checkin_tokens"
    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    seminar_id: Mapped[int] = mapped_column(ForeignKey("seminars.id", ondelete="CASCADE"))
    token: Mapped[str] = mapped_column(String, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
