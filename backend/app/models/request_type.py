from typing import List

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class RequestType(Base):
    __tablename__ = "request_type"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    name: Mapped[str] = mapped_column(sa.String, nullable=False)

    requests: Mapped[List["Request"]] = relationship(
        secondary="type_of", back_populates="request_types"
    )
