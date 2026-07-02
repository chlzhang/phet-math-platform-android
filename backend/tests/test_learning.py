from fastapi.testclient import TestClient
from app.main import app

def test_record_history_progress_mistakes():
    with TestClient(app) as client:
        # create a user first
        u = client.post("/api/v1/users", json={"device_id": "dl", "nickname": "x"}).json()["data"]
        uid = u["id"]

        r = client.post("/api/v1/learning/record", json={
            "user_id": uid,
            "type": "chicken_rabbit",
            "type_name": "鸡兔同笼",
            "problem_text": "8头22脚",
            "score": 50
        })
        assert r.status_code == 200

        r = client.post("/api/v1/learning/record", json={
            "user_id": uid,
            "type": "chicken_rabbit",
            "type_name": "鸡兔同笼",
            "problem_text": "8头22脚",
            "score": 100
        })
        assert r.status_code == 200

        hist = client.get(f"/api/v1/learning/history?user_id={uid}").json()["data"]
        assert hist["total"] == 2

        prog = client.get(f"/api/v1/learning/progress?user_id={uid}").json()["data"]
        assert prog["progress"]["chicken_rabbit"]["total"] == 2
        assert prog["progress"]["chicken_rabbit"]["correct"] == 1

        ms = client.get(f"/api/v1/learning/mistakes?user_id={uid}").json()["data"]
        assert ms["total"] == 1
