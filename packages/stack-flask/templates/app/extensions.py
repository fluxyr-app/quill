"""Flask extensions, instantiated without an app (initialized in the factory)."""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()
