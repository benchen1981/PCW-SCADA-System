from app.virtual_plc.register_map import RegisterMap

def test_encode_decode():
    rm = RegisterMap({"PT111S": {"address": 0, "datatype": "uint16", "scale": 1000}})
    address, raw = rm.encode("PT111S", 1.523)
    assert address == 0
    assert raw == 1523
    assert rm.decode("PT111S", raw) == 1.523
