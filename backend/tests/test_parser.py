import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.problem_parser import parse_problem


def test_chicken_rabbit():
    result = parse_problem("笼子里有若干只鸡和兔，从上面数有8个头，从下面数有22只脚，鸡兔各几只？")
    assert result["type"] == "chicken_rabbit"
    assert result["params"]["heads"] == 8
    assert result["params"]["legs"] == 22


def test_tree_planting_both():
    result = parse_problem("20米的小路，每隔5米种一棵树，两端都种，一共种多少棵？")
    assert result["type"] == "tree_planting"
    assert result["params"]["length"] == 20
    assert result["params"]["interval"] == 5
    assert result["params"]["type"] == "both"


def test_tree_planting_circle():
    result = parse_problem("圆形池塘周长80米，每隔5米种一棵树，一共种多少棵？")
    assert result["type"] == "tree_planting"
    assert result["params"]["type"] == "circle"


def test_fraction_add():
    result = parse_problem("计算 1/2 + 1/3 等于多少？")
    assert result["type"] == "fraction"
    assert result["params"]["a"] == 1
    assert result["params"]["b"] == 2
    assert result["params"]["c"] == 1
    assert result["params"]["d"] == 3
    assert result["params"]["op"] == "+"


def test_travel_meet():
    result = parse_problem("甲乙两人相距300米，同时相向而行，甲每分钟走60米，乙每分钟走40米，几分钟相遇？")
    assert result["type"] == "travel_meet"
    assert result["params"]["distance"] == 300
    assert result["params"]["v1"] == 60
    assert result["params"]["v2"] == 40


def test_travel_chase():
    result = parse_problem("甲每分钟走80米，乙每分钟走60米，甲落后乙200米，几分钟追上？")
    assert result["type"] == "travel_chase"
    assert result["params"]["distance"] == 200
    assert result["params"]["v1"] == 80
    assert result["params"]["v2"] == 60


def test_polygon_parallelogram():
    result = parse_problem("平行四边形的底是6厘米，高是4厘米，面积是多少？")
    assert result["type"] == "polygon_area"
    assert result["params"]["shape"] == "parallelogram"
    assert result["params"]["a"] == 6
    assert result["params"]["h"] == 4


def test_circle_area():
    result = parse_problem("半径为4厘米的圆，面积是多少？")
    assert result["type"] == "circle_area"
    assert result["params"]["r"] == 4


def test_unknown():
    result = parse_problem("这是一道 unrelated 的题目。")
    assert result["type"] == "unknown"


def test_empty():
    result = parse_problem("")
    assert result["type"] == "unknown"


if __name__ == "__main__":
    test_chicken_rabbit()
    test_tree_planting_both()
    test_tree_planting_circle()
    test_fraction_add()
    test_travel_meet()
    test_travel_chase()
    test_polygon_parallelogram()
    test_circle_area()
    test_unknown()
    test_empty()
    print("All tests passed!")
