import csv
import json

# Mapping for type letters to full names
TYPE_MAPPING = {"С": "село","C": "село","X": "селище","X": "селище", "Щ": "селище", "Т": "селище","T": "селище", "М": "місто", "К": "місто","M": "місто", "K": "місто"}

def normalize_text(text):
    """Basic normalization: strip and lowercase."""
    return text.replace("–","-").replace("’","'").strip().lower()

def normalize_oblast(oblast):
    """Normalize oblast name, appending 'область' if missing."""
    oblast = oblast.strip()
    if "область" not in oblast.lower():
        oblast = oblast + " область"
    return oblast.lower()

def normalize_rayon(rayon):
    """Normalize rayon name; if missing the word 'район' or 'р-н', append it."""
    if not rayon:
        return None
    rayon = rayon.strip()
    if ("район" not in rayon.lower()) and ("р-н" not in rayon.lower()):
        rayon = rayon + " район"
    return rayon.lower()

def meaningful_prefix(code):
    """
    Remove trailing zeros from the code to obtain the meaningful prefix.
    For example, "5625800000" becomes "56258".
    """
    return code.rstrip("0")

def get_csv_primary_name(rec_name):
    """
    Extract the primary name from the CSV record's name.
    E.g., "РІВНЕНСЬКА ОБЛАСТЬ/М.РІВНЕ" becomes "РІВНЕНСЬКА ОБЛАСТЬ".
    """
    return rec_name.split("/")[0].strip()

def find_record_by_name(records, name):
    """
    Search for a record in CSV records whose normalized primary name exactly matches the given name.
    """
    norm_name = normalize_text(name)
    for rec in records:
        rec_primary = get_csv_primary_name(rec.get("NU", ""))
        if normalize_text(rec_primary) == norm_name:
            return rec
    return None

def find_record_by_prefix_and_name(records, prefix, name,type=None):
    """
    Search for a record in CSV records whose 'code' starts with the meaningful prefix
    (obtained by removing trailing zeros) and whose normalized primary name exactly matches.
    """
    norm_name = normalize_text(name)
    prefix = meaningful_prefix(prefix)
    for rec in records:
        code = rec.get("TE", "")
        rec_primary = get_csv_primary_name(rec.get("NU", ""))
        # Check if the record type matches the provided type (if any)
        # If type is provided, check if it matches the record's type
        if(type and rec.get("NP", "") != type):
            continue
        if code.startswith(prefix) and normalize_text(rec_primary) == norm_name:
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
        reader = csv.DictReader(csvfile, delimiter=';')
        for row in reader:
            records.append(row)
    return records

def update_settlements(settlements, csv_records):
    """
    For each settlement record, update its old_district with the matching KOATUU code
    and type. Caches oblast and rayon lookups to avoid repeated searches.
    """
    oblast_cache = {}  # Cache: normalized oblast name -> oblast record
    rayon_cache = {}   # Cache: (oblast_code, normalized rayon name) -> rayon record

    for settlement in settlements:
        old_district = settlement.get("old_district", {})
        if not old_district:
            continue

        # Extract raw fields
        title = old_district.get("title", "")
        oblast_raw = old_district.get("oblast", "")
        rayon_raw = old_district.get("rayon", "")
        settlement_name = old_district.get("name", "").strip()

        # Normalize oblast and rayon names for matching
        norm_oblast = normalize_oblast(oblast_raw)
        norm_rayon = normalize_rayon(rayon_raw) if rayon_raw else None

        # Lookup oblast record (using cache)
        if norm_oblast in oblast_cache:
            oblast_rec = oblast_cache[norm_oblast]
        else:
            oblast_rec = find_record_by_name(csv_records, norm_oblast)
            if oblast_rec:
                oblast_cache[norm_oblast] = oblast_rec
        if not oblast_rec:
            print(f"Oblast record not found for: {norm_oblast} with title {title}")
            continue

        oblast_code = oblast_rec.get("TE", "")

        # If rayon is provided, lookup rayon record (using cache)
        if norm_rayon:
            key = (oblast_code, norm_rayon)
            if key in rayon_cache:
                rayon_rec = rayon_cache[key]
            else:
                rayon_rec = find_record_by_prefix_and_name(csv_records, oblast_code, norm_rayon)
                if rayon_rec:
                    rayon_cache[key] = rayon_rec
            
            if not rayon_rec:
                print(f"Rayon record not found for: {norm_rayon} with title {title}")
                continue
            prefix = rayon_rec.get("TE", "") if rayon_rec else oblast_code
        else:
            prefix = oblast_code

        # Find settlement record by searching for a code that starts with the prefix
        # and matching the settlement name.
        settlement_rec = find_record_by_prefix_and_name(csv_records, prefix, settlement_name)
        if not settlement_rec:
             # If the settlement name contains "м.", try to find city it in oblast directly
            # This is a workaround for cases where the settlement name is not found in the rayon.
            oblast_settlement_rec = find_record_by_prefix_and_name(csv_records, oblast_code, settlement_name, "М" if "м." in title else None)
            if(oblast_settlement_rec):
                settlement_rec = oblast_settlement_rec
                #print(f"Settlement record ONLY found in oblast for: {settlement_name} with prefix: {oblast_code}, title {title}")

        if settlement_rec:
            # Save the full KOATUU code and mapped type into old_district.
            old_district["koatuu"] = settlement_rec.get("TE", "")
            katotth = settlement_rec.get("Код об’єкта Кодифікатора", "")

            type_letter = settlement_rec.get("NP", "")
            old_district["type"] = TYPE_MAPPING.get(type_letter, type_letter)

            if(katotth):
                new_district={'katotth':katotth}
                new_type_letter = settlement_rec.get("Категорія об’єкта Кодифікатора", "")
                new_district["type"] = TYPE_MAPPING.get(new_type_letter, type_letter)
                settlement["new_district"] = new_district

            
        else:
            print(f"Settlement record not found for: {settlement_name} with prefix: {prefix}, title {title}")

    return settlements

def main():
    settlements_file = "data/parsed_settlements.json"
    koatuu_csv_file = "data/source/Перехідна таблиця з КОАТУУ на Кодифікатор.csv"
    output_file = "data/settlements_locations.json"

    # Load settlements JSON data
    with open(settlements_file, "r", encoding="utf-8") as f:
        settlements = json.load(f)

    # Load KOATUU CSV data
    csv_records = load_csv(koatuu_csv_file)

    # Update settlements with matching KOATUU codes and types
    updated_settlements = update_settlements(settlements, csv_records)

    # Filter only settlements that have a koatuu code in their old_district
    settlements_with_koatuu = [
        s for s in updated_settlements
        if "koatuu" in s.get("old_district", {})
    ]


    # Save updated settlements to a new JSON file
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(settlements_with_koatuu, f, ensure_ascii=False, indent=2)

    print(f"Updated settlements with koatuu code saved to {output_file}")

if __name__ == "__main__":
    main()