from app.result_gateway.register_codec import encode
def test_no_data():
    r=encode(None,0,90);assert r.quality==3 and r.engine_status==4
def test_good_and_stale():
    row={'ResultCode':0,'EngineStatus':'OK','X1':None,'Y':None,'N':None}
    assert encode(row,10,90).quality==1
    assert encode(row,100,90).quality==2
