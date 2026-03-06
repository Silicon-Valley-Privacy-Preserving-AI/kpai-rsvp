from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.config.database import Base
from sqlalchemy import func, DateTime
from datetime import datetime
from enum import Enum
from sqlalchemy import Enum as SQLEnum

class UserRole(str, Enum):
    MEMBER = "member"
    STAFF = "staff"

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    email: Mapped[str] = mapped_column(unique=True, index=True)
    username: Mapped[str] = mapped_column()
    password: Mapped[str] = mapped_column()
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, name="user_role_enum"),
        default=UserRole.MEMBER,
        nullable=False
    )

    seminar_rsvps = relationship(
        "SeminarRSVP",
        backref="user",
        cascade="all, delete-orphan"
    )