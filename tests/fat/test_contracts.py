from pathlib import Path
import yaml

def test_required_configuration_exists():
    root=Path(__file__).parents[2]
    for p in ["config/tags.yaml","config/registers.yaml","config/scada.yaml","config/result_gateway.yaml"]:
        assert (root/p).exists()

def test_tag_config_has_enabled_tags():
    root=Path(__file__).parents[2]
    data=yaml.safe_load((root/"config/tags.yaml").read_text())
    assert data
