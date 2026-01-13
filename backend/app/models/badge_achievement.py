from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class BadgeAchievement(Base):
    __tablename__ = "badge_achievement"
    __table_args__ = (
        sa.UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),
    )

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("user.id"), nullable=False)
    badge_id: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    badge_name: Mapped[str] = mapped_column(sa.String, nullable=False)
    rarity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    description: Mapped[str] = mapped_column(sa.String, nullable=True)
    progress: Mapped[int] = mapped_column(sa.Integer, default=0)
    total_required: Mapped[int] = mapped_column(sa.Integer, default=100)
    is_completed: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    awarded_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        nullable=False,
        server_default=sa.text("CURRENT_TIMESTAMP"),
    )

    user: Mapped["User"] = relationship("User", back_populates="badge_achievements")
