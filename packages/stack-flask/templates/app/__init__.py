"""Application factory.

Blueprints and models are auto-discovered: drop a new module under
``app/routes/`` that defines a ``Blueprint`` (conventionally ``<name>_bp``) and a
model under ``app/models/`` and they are wired up automatically — no manual
registration edits required.
"""
import importlib
import pkgutil

from flask import Flask, Blueprint

from app.extensions import db, migrate


def _import_submodules(package_name: str) -> None:
    package = importlib.import_module(package_name)
    for _, name, _ in pkgutil.iter_modules(package.__path__):
        importlib.import_module(f"{package_name}.{name}")


def create_app(config_object: str = "config.Config") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object)

    # Wire the short-ID scheme (generated per the identifiers convention):
    # UUIDs serialize as 22-char Base-62 on the wire, and <sid:...> route params
    # arrive as uuid.UUID objects. Loaded defensively so the app still boots
    # before that layer has been generated.
    try:
        from app.json_provider import ShortIDJSONProvider

        app.json = ShortIDJSONProvider(app)
    except Exception:
        pass
    try:
        from app.converters import ShortIDConverter

        app.url_map.converters["sid"] = ShortIDConverter
    except Exception:
        pass

    db.init_app(app)
    migrate.init_app(app, db)

    # Populate SQLAlchemy metadata by importing every model module.
    _import_submodules("app.models")

    # Auto-register every Blueprint defined under app.routes.
    import app.routes as routes_pkg

    for _, name, _ in pkgutil.iter_modules(routes_pkg.__path__):
        module = importlib.import_module(f"app.routes.{name}")
        for attr in vars(module).values():
            if isinstance(attr, Blueprint):
                app.register_blueprint(attr)

    return app
