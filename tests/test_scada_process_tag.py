from app.scada.process_tag import AlarmLimits, ProcessTag

def make_tag():
    return ProcessTag("PT", "PCW.PT.PV", "bar", AlarmLimits(1.8, 1.7, 1.1, 1.0))

def test_alarm_states():
    t=make_tag()
    for v, state in [(1.9,"HIHI"),(1.7,"HI"),(1.4,"NORMAL"),(1.1,"LO"),(0.9,"LOLO")]:
        t.update(v, int(v*1000)); assert t.alarm_state == state

def test_bad_quality():
    t=make_tag(); t.mark_bad(); assert t.quality == "BAD" and t.alarm_state == "BAD_QUALITY"
