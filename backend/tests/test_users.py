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


def test_delete_user_cascades_learning_records():
    with TestClient(app) as client:
        u = client.post("/api/v1/users", json={"device_id": "d-cascade", "nickname": "小宝"}).json()["data"]
        uid = u["id"]

        for score in [50, 100]:
            r = client.post("/api/v1/learning/record", json={
                "user_id": uid,
                "type": "chicken_rabbit",
                "type_name": "鸡兔同笼",
                "problem_text": "8头22脚",
                "score": score,
                "duration": 30
            })
            assert r.status_code == 200

        hist_before = client.get(f"/api/v1/learning/history?user_id={uid}").json()["data"]
        assert hist_before["total"] == 2

        res = client.delete(f"/api/v1/users/{uid}")
        assert res.status_code == 200
        assert res.json()["success"] is True

        hist_after = client.get(f"/api/v1/learning/history?user_id={uid}").json()["data"]
        assert hist_after["total"] == 0
