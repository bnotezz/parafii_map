import json
import time
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut

# Create a geolocator instance with a custom user agent.
geolocator = Nominatim(user_agent="church_geocoder")

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
with open('../data/churches.json', 'r', encoding='utf-8') as f:
    churches = json.load(f)

# Iterate over each church entry and add the coordinates.
for church in churches:
    # Skip if coordinates are already present.
    if(church.get("coordinates")):
        continue
    loc = church.get("location", "").strip()

    if loc:
        coords = query_geocoder(f"{loc} Рівненська область", f"{loc} Хмельницька область")
        if coords:
            church["coordinates"] = coords
            print("Coordinates: ", coords)
        else:
            print("Coordinates not found for query: ", loc)
            # In case no coordinates are found, you can set it to None or handle it as needed.
            church["coordinates"] = None

# Write the updated data back to a new JSON file.
with open('../data/churches_with_coordinates.json', 'w', encoding='utf-8') as f:
    json.dump(churches, f, ensure_ascii=False, indent=4)

print("Updated JSON file saved as 'jsonFile_with_coordinates.json'.")
