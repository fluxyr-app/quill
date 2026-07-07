"""Base model with common fields. All models must extend BaseModel."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, Uuid as SAUuid

from app.extensions import db


class BaseModel(db.Model):
    """Base model class with common fields.

    Provides a Base-62 short-ID-friendly UUID primary key plus created_at /
    updated_at timestamps, and small persistence helpers. The ``Uuid`` column
    type is dialect-agnostic (native UUID on Postgres, CHAR(32) on SQLite).
    """
    __abstract__ = True

    id = db.Column(SAUuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )

    def to_dict(self):
        """Convert model instance to a dictionary (UUIDs serialize as short IDs)."""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }

    def save(self):
        """Persist the model instance."""
        db.session.add(self)
        db.session.commit()
        return self

    def delete(self):
        """Delete the model instance."""
        db.session.delete(self)
        db.session.commit()
        return self

    @classmethod
    def find_by_id(cls, id):
        """Find a model instance by primary key."""
        return db.session.get(cls, id)

    @classmethod
    def find_all(cls):
        """Return all model instances."""
        return db.session.execute(select(cls)).scalars().all()
