"""Standard JSON response helpers. Use these for all route responses."""
from flask import jsonify


def error_response(message: str, status: int = 400, code: str | None = None):
    """Return a standardized JSON error: {"error": {"message", "code"?}}."""
    payload = {"error": {"message": message}}
    if code:
        payload["error"]["code"] = code
    return jsonify(payload), status


def success_response(data, status: int = 200):
    """Return a JSON success response."""
    return jsonify(data), status
