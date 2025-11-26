from datetime import date, datetime
from typing import List

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)

    first_name: Mapped[str] = mapped_column(sa.String, nullable=False)
    last_name: Mapped[str] = mapped_column(sa.String, nullable=False)
    email: Mapped[str] = mapped_column(sa.String, nullable=False, unique=True)
    password: Mapped[str] = mapped_column(sa.String, nullable=False)
    date_of_birth: Mapped[date] = mapped_column(sa.Date, nullable=False)
    about_me: Mapped[str] = mapped_column(sa.String, nullable=False)
    is_volunteer: Mapped[bool] = mapped_column(sa.Boolean, nullable=False)
    avg_rating: Mapped[float] = mapped_column(sa.Float, default=0.0)
    level: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=1)
    experience: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    badges: Mapped[str] = mapped_column(sa.String, nullable=False, default="")

    created_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        nullable=False,
        server_default=sa.text("CURRENT_TIMESTAMP"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        nullable=False,
        server_default=sa.text("CURRENT_TIMESTAMP"),
        onupdate=sa.text("CURRENT_TIMESTAMP"),
    )

    requests: Mapped[List["Request"]] = relationship(
        "Request", back_populates="creator"
    )

    quests: Mapped[List["Quest"]] = relationship("Quest", back_populates="user")

    def experience_to_next_level(self) -> int:
        return 100 * self.level 

    def add_experience(self, xp: int) -> None:
        if xp <= 0:
            return

        self.experience += xp

        while self.experience >= self.experience_to_next_level():
            self.experience -= self.experience_to_next_level()
            self.level += 1
        
        if self.level >= 2:
            self.add_badge(1)

    def add_badge(self, badge_id: int) -> None:
        current_badges = self.badges.split(",") if self.badges else []
        str_id = str(badge_id)
        if str_id not in current_badges:
            current_badges.append(str_id)
            self.badges = ",".join(current_badges)
