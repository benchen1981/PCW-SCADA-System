from datetime import datetime,timezone,timedelta
from app.database.db import Database
from app.historian.repository import HistorianRepository
from app.processor.minute_processor import MinuteProcessor
from app.model_adapter.stub_model import StubModelAdapter

def test_minute_pipeline(tmp_path):
    db=Database(tmp_path/'t.db'); db.init_schema(); repo=HistorianRepository(db); t=datetime(2026,1,1,0,1,tzinfo=timezone.utc)
    for i in range(60): repo.write(t-timedelta(seconds=59-i),'PT111S',1.4+i/10000,'GOOD')
    x=MinuteProcessor(repo).build('PT111S',t); assert x.sample_count==60 and x.data_quality=='GOOD'
    r=StubModelAdapter().infer(x); assert r.model_version=='STUB-V1' and r.result_code==0
