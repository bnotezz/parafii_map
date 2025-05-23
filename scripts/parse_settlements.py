import re
import json

def main():
    settlements_file = "data/parsed_settlements.json"
    address_list_file = "data/source/Географічний покажчик до населених пунктів до Каталогу метричних книг.docx"

    try:
        from docx import Document
    except ImportError:
        print("The 'python-docx' library is not installed. Install it using 'pip install python-docx'.")
        raise

    # Load the document
    doc = Document(address_list_file)

    # Parse all paragraphs
    parsed_settlements = []
    for para in doc.paragraphs:
        parsed = parse_settlement(para.text)
        if parsed:
            parsed_settlements.append(parsed)

    # Save to JSON file
    with open(settlements_file, "w", encoding="utf-8") as json_file:
        json.dump(parsed_settlements, json_file, ensure_ascii=False, indent=4)
    
    print(f"Parsed {len(parsed_settlements)} settlements saved to {settlements_file}")


def parse_location(text):
    country_pattern = r"\s*Республіка (?P<country>\S+?)\s*,"
    pattern = r"^(?:с\.|смт|с-ще|м\.|м,)?\s*(?P<name>[^,]+),\s*(?:с\.|смт|с-ще|м\.|м,)?\s*,?\s*(?P<oblast>\S+)\s+(обл\.|воєводство|область)(?:,\s*(?P<rayon>\S+)\s+(р-н|район|повіт))?$"
    
    country = ""
    country_match=re.search(country_pattern, text)
    if country_match:       
        country = country_match.group("country").strip()
        if country:
            text = text.replace(country_match.group(0), "")
    
    
    match = re.match(pattern, re.sub(r'\s+', ' ', text.strip()))
    if match:
        location = {
            "name": match.group("name").strip(),
            "oblast": match.group("oblast").strip()
        }
        if country:
            location["country"] = country
        if match.group("rayon"):
            location["rayon"] = match.group("rayon").strip()
        return location

    return None

# Function to parse each line
def parse_settlement(line):
    pattern = r"^(?P<settlement_name>[^,]+),\s*(?P<historic_district>.+?)(?:\s*\((?P<old_district>.+?)\))?\s+(?P<pages>[\d,\s]+)$"
    match = re.match(pattern, line.strip())
    if match:
        settlement_name = match.group("settlement_name").strip()
        old_location = match.group("old_district").strip() if match.group("old_district") else None
        merged = 0
        removed = 0
        old_district = None
        if old_location:
            if old_location.startswith(("с.", "смт", "м.", "м,","с-ще,", "с-ще")):
                old_location = f"{settlement_name}, {old_location}"
            if old_location.startswith("об’єднано з "):
                merged = 1
                old_location = old_location.replace("об’єднано з ", "", 1)
            if old_location.startswith("вилучений з обліку"):
                removed = 1
                old_location = old_location.replace("вилучений з обліку", settlement_name, 1)
            # if " р-н" in old_district:
            #     old_district = old_district.replace(" р-н", " район", 1)
            old_district = parse_location(old_location)
            if old_district:
                old_district["title"] = old_location
            else:
                old_district = {
                    "title": old_location
                }
                print(f"Old district parsing failed for: {old_location}")



        settlement = {
            "name": settlement_name,
            "historic_district": match.group("historic_district").strip()
        }
        if(merged):
            settlement["merged"] = merged
        if(removed):
            settlement["removed"] = removed
        if old_district:
            settlement["old_district"] = old_district

        settlement["pages"] = [int(p.strip()) for p in match.group("pages").split(',')]

        return settlement
    else:
        return None



if __name__ == "__main__":
    main()