import csv
import json

def find_record_by_code(records, code,field_name="koatuu"):
    """
    Search for a record in CSV records whose field exactly matches the given code.
    """
    for rec in records:
        rec_primary = rec.get(field_name, "")
        if code == rec_primary:
            return rec
    return None

def load_csv(filename):
    """
    Load CSV records into a list of dictionaries.
    Assumes the CSV has headers: code, type, name.
    Uses semicolon as the delimiter.
    """
    records = []
    with open(filename, newline='', encoding="utf-8-sig") as csvfile:
        reader = csv.DictReader(csvfile, delimiter=',')
        for row in reader:
            records.append(row)
    return records

def update_settlements(settlements, csv_records):
    """
    For each settlement record, update its old_district with the matching KOATUU code
    and type. Caches oblast and rayon lookups to avoid repeated searches.
    """
    
    for settlement in settlements:
        old_district = settlement.get("old_district", {})
        if not old_district:
            continue

        # Extract raw fields
        title = old_district.get("title", "")
        type = old_district.get("type", "")
        koatuu = old_district.get("koatuu", "")
        if not koatuu:
            continue

        katotth = None
        new_district = settlement.get("new_district", {})
        if new_district:
            katotth = new_district.get("katotth", "")
            type = new_district.get("type", type)

        place_record = find_record_by_code(csv_records, koatuu,"koatuu")
        if not place_record and katotth:
            # Try to find by katotth
            place_record = find_record_by_code(csv_records, katotth,"katotth")
        if place_record:
            settlement["new_district"] = {
                "katotth": place_record.get("katotth", ""),
                "name": place_record.get("name", ""),
                "region": place_record.get("region", ""),
                "rayon": place_record.get("rayon", ""),
                "hromada": place_record.get("hromada", ""),
                "type": type
            }
            settlement["osm_id"]= place_record.get("osm_id", "")
            
        else:
            print(f"Settlement record not found for: {title} with koatuu: {koatuu}")

    return settlements

def main():
    settlements_file = "data/settlements_locations.json"
    places_csv_file = "data/source/ua-name-places.csv"
    output_file = "data/settlements_locations.json"

    # Load settlements JSON data
    with open(settlements_file, "r", encoding="utf-8") as f:
        settlements = json.load(f)

    # Load Places CSV data
    csv_records = load_csv(places_csv_file)

    # Update settlements with matching details
    updated_settlements = update_settlements(settlements, csv_records)

    # Save updated settlements to a new JSON file
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(updated_settlements, f, ensure_ascii=False, indent=2)

    print(f"Updated settlements with details code saved to {output_file}")

if __name__ == "__main__":
    main()