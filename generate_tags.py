import yaml
tags = []
# Equipment
tags.append({"tag_name": "TK-501_L", "system": "PCW01", "enabled": True, "engineering_unit": "m", "scenario": "normal", "base_value": 2.5, "noise_std": 0.05, "min_value": 0.0, "max_value": 5.0})
tags.append({"tag_name": "P-101A", "system": "PCW01", "enabled": True, "engineering_unit": "state", "scenario": "normal", "base_value": 1, "noise_std": 0, "min_value": 0, "max_value": 1})

# Submains
for sub in range(1, 4):
    for side, bv in [("S", 1.45), ("R", 1.20)]:
        tags.append({
            "tag_name": f"PCW01.S{sub:02d}.PT_{side}",
            "system": "PCW01",
            "enabled": True,
            "engineering_unit": "bar",
            "scenario": "normal",
            "base_value": bv,
            "noise_std": 0.003,
            "min_value": 0.0,
            "max_value": 2.5
        })

with open("config/tags.yaml", "w") as f:
    yaml.dump({"tags": tags}, f, sort_keys=False)
