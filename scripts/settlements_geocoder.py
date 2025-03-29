import json
import time
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut

# Create a geolocator instance with a custom user agent.
geolocator = Nominatim(user_agent="settlements_geocoder")

def geocode_location(query):
    try:
        location = geolocator.geocode(query)
        if location:
            # Return coordinates in [longitude, latitude] format.
            return [location.longitude, location.latitude]
    except GeocoderTimedOut:
        # Wait and retry if a timeout occurs.
        time.sleep(1)
        return geocode_location(query)
    return None

def query_geocoder(*query:str):
    for q in query:
        print("Query: ", q)
        coords = geocode_location(q)
        if coords:
            return coords
    return None

# Load the JSON data
with open('../data/parsed_settlements.json', 'r', encoding='utf-8') as f:
    settlements = json.load(f)

# Iterate over each church entry and add the coordinates.
for settlement in settlements:
    # Skip if coordinates are already present.
    if(settlement.get("coordinates")):
        continue
    old_district = settlement.get("old_district", {}).get("settlement", {}).get("old_district", {}).get("title", "").strip()

    if old_district:
        coords = query_geocoder(old_district)
        if coords:
            settlement["coordinates"] = coords
            print("Coordinates: ", coords)
        else:
            print("Coordinates not found for query: ", old_district)
            # In case no coordinates are found, you can set it to None or handle it as needed.
            settlement["coordinates"] = None

# Write the updated data back to a new JSON file.
with open('../data/parsed_settlements.json', 'w', encoding='utf-8') as f:
    json.dump(settlements, f, ensure_ascii=False, indent=4)

print("Updated JSON file saved as 'parsed_settlements.json'.")
