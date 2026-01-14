from typing import Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class TypeOf(Base):
    __tablename__ = "type_of"

    id: Mapped[Optional[int]] = mapped_column(sa.Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("request.id"), nullable=False, index=True)
    request_type_id: Mapped[int] = mapped_column(sa.Integer, sa.ForeignKey("request_type.id"), nullable=False)
