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

def geocode_node(query, limit=10):
    """
    Return the first OSM node matching `query`, as a dict with its id and coords,
    or None if no node is found.
    """
    try:
        # ask for up to `limit` results
        candidates = geolocator.geocode(
            query,
            exactly_one=False,
            limit=limit,
        )
    except GeocoderTimedOut:
        time.sleep(1)
        return geocode_node(query, limit=limit)

    if not candidates:
        return None

    point = candidates[0]

    for loc in candidates:
        # each `loc.raw` comes straight from the JSON output of Nominatim,
        # which includes "osm_type" and "osm_id" :contentReference[oaicite:0]{index=0}
        if loc.raw.get("osm_type") == "node":
            point = loc
            break

    return {
            "osm_id":    point.raw["osm_id"],       # the OSM node ID
            "lon": point.longitude,
            "lat":  point.latitude,
        }

def lookup_othercountry_settlement(title, settlement, country):
    if(not title):
        return settlement
    # Normalize the title for geocoding
    title = title.replace("–","-").replace("’","'").strip().lower()
    # Replace " р-н" with " район" and remove " с.," or " м.," if present
    query  = title.replace(" р-н", " район", 1).replace(" с.,", "", 1).replace(" м.,", "", 1)

    old_district = settlement["old_district"]
    if(old_district):
        query = ""
        q_name = old_district.get("name", "")
        if(q_name):
            query = f"{query} {q_name}"
        q_rayon = old_district.get("rayon", "")
        if(q_rayon):
            query = f"{query} {q_rayon}"
        q_oblast = old_district.get("oblast", "")
        if(q_oblast):
            query = f"{query} {q_oblast}"
        q_country = old_district.get("country", country)   
        if(q_country):
            query = f"{query} {q_country}" 

    query = query.strip()

    # Placeholder for actual implementation
    #print(f"Settlement {title} is in {country}, but not in Ukraine.")
    if query:
        coords = geocode_node(query)
        if(coords):
            osm_id = coords['osm_id']
            if(osm_id):
                settlement["osm_id"] =  f"{osm_id}"
            settlement["location"] = [coords['lon'], coords['lat']]

    #settlement["old_district"]["koatuu"] = "other_country"
    return settlement

def main():
    settlements_file = "data/parsed_settlements.json"
    locations_file = "data/settlements_locations.json"

    # Load settlements JSON data
    with open(settlements_file, "r", encoding="utf-8") as f:
        settlements = json.load(f)

    # Load settlements locations JSON data
    with open(locations_file, "r", encoding="utf-8") as f:
        locations = json.load(f)

    for settlement in settlements:
        old_district = settlement.get("old_district", {})
        if not old_district:
            continue
         # Extract raw fields
        title = old_district.get("title", "")
        country = old_district.get("country", "")
        if country and "україна" not in country.lower():
            if title:
                settlement = lookup_othercountry_settlement(title, settlement, country)
                location = settlement.get("location")
                if location:
                    locations.append(settlement)
                    print(f"Added settlement: {settlement['name']} with location: {location}")
                else:
                    print(f"Location not found for settlement: {settlement['name']}")
            else:
                print(f"Country is not Ukraine for: {title} with country {country}")
            continue

    # Save updated settlements to a new JSON file
    with open(locations_file, "w", encoding="utf-8") as f:
        json.dump(locations, f, ensure_ascii=False, indent=2)

    print(f"Updated settlements saved to {locations_file}")

if __name__ == "__main__":
    main()
