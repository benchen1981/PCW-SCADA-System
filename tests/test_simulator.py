from app.simulator.sensor_simulator import SensorSimulator

def test_sample():
    sim = SensorSimulator([{"tag_name":"PT111S","enabled":True,"scenario":"fixed","base_value":1.45,"min_value":0,"max_value":2.5}], seed=1)
    s = sim.sample_all()[0]
    assert s.tag_name == "PT111S"
    assert s.value == 1.45
    assert s.quality == "GOOD"
