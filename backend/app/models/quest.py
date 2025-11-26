from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Quest(Base):
    __tablename__ = "quest"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(sa.ForeignKey("user.id"), nullable=False)
    request_type_id: Mapped[int] = mapped_column(sa.ForeignKey("request_type.id"), nullable=False)
    target_count: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    current_count: Mapped[int] = mapped_column(sa.Integer, default=0, nullable=False)
    deadline: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False)
    
    user: Mapped["User"] = relationship("User", back_populates="quests")
    request_type: Mapped["RequestType"] = relationship("RequestType")
