import json
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut


# Load the JSON list of churches from file
with open('../data/churches.json', 'r', encoding='utf-8') as f:
    churches = json.load(f)

features = []
for church in churches:
    info = {}
    info["loc"] = church.get('location', '').strip()
    info["villages"] = church.get('villages', '').strip()
    info["church"] = church.get('church', '').strip()
    info["povit"] = f"{church.get('povit', '').strip()} повіт"
    volost = church.get('volost', '').strip()
    if(info["povit"] and volost):
       info["povit"] = f"{info["povit"]} {volost} волость"
    
    info["tooltip"] = f"{info["loc"]} \n{info["church"]} \n{info["povit"]} \n{info["villages"]}"
    coords = church.get("coordinates")
    if coords:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": coords
            },
            "properties": info  # include all original properties
        }
        features.append(feature)

# Build the GeoJSON FeatureCollection
geojson = {
    "type": "FeatureCollection",
    "features": features
}

# Write the GeoJSON data to a file
with open('../web/geodata/churches.geojson', 'w', encoding='utf-8') as f:
    json.dump(geojson, f, ensure_ascii=False, indent=4)

print("GeoJSON file 'churches.geojson' created successfully.")
