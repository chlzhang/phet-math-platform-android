from app.models import User, LearningRecord


def test_user_fields():
    u = User(device_id="dev-1", nickname="宝贝")
    assert u.nickname == "宝贝"


def test_learning_record_fields():
    r = LearningRecord(user_id=1, type="chicken_rabbit", type_name="鸡兔同笼", score=100)
    assert r.type_name == "鸡兔同笼"
