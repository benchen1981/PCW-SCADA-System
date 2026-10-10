from pathlib import Path

def test_sat_evidence_directories_exist():
    root=Path(__file__).parents[2]
    for d in ["evidence","logs","data","docs/sat"]:
        assert (root/d).is_dir()
