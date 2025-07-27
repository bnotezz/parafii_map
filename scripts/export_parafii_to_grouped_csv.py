import csv
import json
import logging

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

def group_parafii(locations_mapping_path, parafii_path):
    with open(parafii_path, 'r', encoding='utf-8') as f:
        parafii = json.load(f)
    
    # Load locations mapping using 'id' as the key
    with open(locations_mapping_path, 'r', encoding='utf-8') as f:
        locations_mapping = {row['id']: row for row in csv.DictReader(f)}
    logger.info(f"Loaded {len(parafii)} parafii from {parafii_path}")
    logger.info(f"Loaded {len(locations_mapping)} locations from mapping file")

    # Prepare GeoJSON features             
    features = {}

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
            "point": f"POINT ({coords[0]} {coords[1]})",
            "name": parafia['title'],
            'settlements': parafia.get('settlements', ''),
            'uri':f"https://daro-metric-map.pages.dev/parafia/{parafia['id']}/"
        } 

        religion = parafia.get('religion', '_other')
        religion_group = features.get(religion)
        if(not religion_group):
            religion_group = {}
            features[religion] = religion_group
        
        povit = parafia.get('povit', '_other')
        povit_group = religion_group.get(povit)
        if(not povit_group):
            povit_group = []
            religion_group[povit] = povit_group

        povit_group.append(feature)

    return features
    
import os

def export_parafii(features,output_dir):

    os.makedirs(output_dir, exist_ok=True)

    if(features):
        for religion, povites in features.items():
            for povit, parafias in povites.items():
                csv_output_file = f"{output_dir}/{povit} {religion}.csv"
                with open(csv_output_file, "w", encoding="utf-8") as f:
                    f.write("WKT,Назва,Реєстр,Населені пункти\n")
                    for parafia in parafias:
                        f.write(f'"{parafia["point"]}","{parafia["name"]}","{parafia["uri"]}","{parafia["settlements"]}"\n')

    


def main():
    locations_mapping='data/locations_mapping.csv'
    parafii_path='data/parafii_locations.json'

    features  = group_parafii(locations_mapping,parafii_path)
    
    export_parafii(
        features,
        'out/misc/groups'
    )

if __name__ == "__main__":
    main()