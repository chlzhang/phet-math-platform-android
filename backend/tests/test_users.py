from fastapi.testclient import TestClient
from app.main import app


def test_create_and_list_user():
    with TestClient(app) as client:
        res = client.post("/api/v1/users", json={"device_id": "d1", "nickname": "宝贝"})
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["nickname"] == "宝贝"
        uid = data["id"]

        res = client.get("/api/v1/users?device_id=d1")
        assert res.status_code == 200
        assert len(res.json()["data"]["users"]) >= 1

        res = client.put(f"/api/v1/users/{uid}", json={"nickname": "小明"})
        assert res.json()["data"]["nickname"] == "小明"

        res = client.delete(f"/api/v1/users/{uid}")
        assert res.json()["success"] is True
