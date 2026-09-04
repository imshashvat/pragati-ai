"""
app/models/__init__.py
──────────────────────
Import all models here so that SQLAlchemy's metadata sees them when
Base.metadata.create_all() is called from main.py.
"""

from app.models.project import Project  # noqa: F401
from app.models.snapshot import ProjectSnapshot  # noqa: F401
from app.models.prediction import Prediction, RiskDriver  # noqa: F401
from app.models.alert import Alert, ReviewNote  # noqa: F401
from app.models.ingestion_log import IngestionLog, User  # noqa: F401
