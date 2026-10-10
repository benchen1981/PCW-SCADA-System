from app.scada.prediction_tag import PredictionTag
def test_decode():
    t=PredictionTag('PT111S');t.update([0,1,0,0,0,5,1]);assert (t.engine_status,t.quality,t.age_seconds)==('OK','GOOD',5)
