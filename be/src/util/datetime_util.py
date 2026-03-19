"""
SQLite는 DateTime(timezone=True)로 선언해도 tzinfo를 제거한 naive datetime을 반환한다.
응답 직렬화 시 Pydantic이 naive datetime을 timezone-suffix 없이 출력하면
프론트엔드 JS가 이를 로컬 시간으로 해석해 오차가 발생한다.

이 모듈의 UTCDatetime / OptionalUTCDatetime 타입을 응답 스키마에 사용하면
naive datetime에 UTC(+00:00)를 자동으로 붙여 직렬화한다.
"""
from datetime import datetime, timezone
from typing import Annotated, Optional

from pydantic import BeforeValidator


def _ensure_utc(v: datetime | None) -> datetime | None:
    """naive datetime → UTC-aware datetime으로 변환."""
    if isinstance(v, datetime) and v.tzinfo is None:
        return v.replace(tzinfo=timezone.utc)
    return v


# 응답 스키마 datetime 필드에 사용할 타입 aliases
UTCDatetime = Annotated[datetime, BeforeValidator(_ensure_utc)]
OptionalUTCDatetime = Annotated[Optional[datetime], BeforeValidator(_ensure_utc)]
