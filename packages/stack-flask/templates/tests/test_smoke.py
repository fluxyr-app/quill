"""Baseline smoke tests for the scaffold. Feature prompts add their own tests."""


def test_app_factory(app):
    assert app is not None


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"
