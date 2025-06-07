import csv
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def export_parafii(locations_mapping_path, parafii_path, output_path):
    with open(parafii_path, 'r', encoding='utf-8') as f:
        parafii = json.load(f)
    
    # Load locations mapping using 'id' as the key
    with open(locations_mapping_path, 'r', encoding='utf-8') as f:
        locations_mapping = {row['id']: row for row in csv.DictReader(f)}
    logger.info(f"Loaded {len(parafii)} parafii from {parafii_path}")
    logger.info(f"Loaded {len(locations_mapping)} locations from mapping file")

    # Prepare GeoJSON features             
    features = []

    for parafia in parafii:
        mapping = locations_mapping.get(parafia['id'])
        if mapping:
            parafia['location'] = [
                float(mapping['lon']),
                float(mapping['lat'])
            ]
            logger.info(f"Updated location for parafia {parafia['title']} with ID {parafia['id']}")
        
        coords = parafia.get('location')
        if not coords:
            logger.warning(f"No coordinates found for parafia {parafia['title']} with ID {parafia['id']}")
            continue

       

        feature = {
            "type": "Feature",
            "properties": {
                "id": parafia['id'],
                "osm_id": parafia.get('osm_id', ''),
                "title": parafia['title'],
                'religion': parafia.get('religion', ''),
                'settlements': parafia.get('settlements', '')
            },
            "geometry": {
                "type": "Point",
                "coordinates": coords
            }
        } 

        new_district = parafia.get('new_district')    
        if new_district:
             feature['properties']["modern_settlement"] = f"{new_district['type']} {new_district['name']}, {new_district['rayon']}, {new_district['region']}"
        else:
            logger.warning(f"No new_district found for {parafia['church_settlement']}")
       
        features.append(feature)
    # Build the GeoJSON FeatureCollection
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    logger.info(f"Wrote {len(features)} records to {output_path}")
    



def main():
    locations_mapping='data/locations_mapping.csv'
    parafii_path='data/parafii_locations.json'
    output_path='data/parafii.geojson'
    export_parafii(
        locations_mapping,
        parafii_path,
        output_path
    )

if __name__ == "__main__":
    main()