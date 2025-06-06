#!/usr/bin/env python3
import subprocess
import sys, os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SCRIPTS = [
    "metric_catalog_parser.py", #1
    "parse_settlements.py", #2
    "find_koatuu_code.py", #3
    "other_country_settlements_geocoder.py", #4
    "find_settlements_details.py", #5
    "settlements_geocoder.py", #6
    "find_parafii_locations.py", #7
    "export_parafii_to_geojson.py", #8
]

def run(script_name):
    script_path = os.path.join(BASE_DIR, script_name)

    print(f"→ Running {script_name} …")
    proc = subprocess.run([sys.executable, script_path], check=True)
    print(f"✔ {script_name} completed.\n")

def main():
    for s in SCRIPTS:
        try:
            run(s)
        except subprocess.CalledProcessError as e:
            print(f"✖ {s} failed (exit {e.returncode}). Aborting.", file=sys.stderr)
            sys.exit(e.returncode)
    print("🎉 All scripts finished successfully!")

if __name__ == "__main__":
    main()
