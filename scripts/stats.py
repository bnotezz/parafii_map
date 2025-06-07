import re
import json
import logging

def geojson_stats(logger):  
    geojson_path = "data/parafii.geojson"
    output_path = "data/duplicates.json"
    with open(geojson_path, 'r', encoding='utf-8') as f:
        geojson_data = json.load(f)

    # Log the number of features in the geojson
    logger.info(f"Number of features in the geojson: {len(geojson_data['features'])}")

    duplicates = []
    # Log the number of unique locations
    unique_locations = {}
    for feature in geojson_data['features']:
        feature_coordinates = feature.get("geometry", {}).get("coordinates")
        # convert coordinates to a tuple for uniqueness
        if feature_coordinates:
            coords_tuple = tuple(feature_coordinates)
            if coords_tuple not in unique_locations:
                unique_locations[coords_tuple] = []
            unique_locations[coords_tuple].append(feature)

    logger.info(f"Number of unique locations: {len(unique_locations)}")
    # Log the number of features with the same coordinates
    non_unique_count = 0
    for coords, features in unique_locations.items():
        if len(features) > 1:
            non_unique_count+=1
            logger.info(f"Multiple features with the same coordinates {coords}: {len(features)} OSM ID: {features[0]['properties'].get('osm_id', 'Unknown')}")
            for feature in features:
                duplicates.append({
                    'id': feature['properties'].get('id', 'Unknown'),
                    'title': feature['properties'].get('title', 'Unknown'),
                    'religion': feature['properties'].get('religion', 'Unknown'),
                    'modern_settlement': feature['properties'].get('modern_settlement', 'Unknown'),
                })
                logger.info(f"Feature ID: {feature['properties'].get('id', 'Unknown')} - Title: {feature['properties'].get('title', 'Unknown')}")

    logger.info(f"Number of non-unique locations (multiple features with the same coordinates): {non_unique_count}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(duplicates, f, ensure_ascii=False, indent=2)
    logger.info(f"Wrote {len(duplicates)} records to {output_path}")

def settlemnts_stats(logger):
    settlements_path = "data/settlements_locations.json"
    with open(settlements_path, 'r', encoding='utf-8') as f:
        settlements = json.load(f)

    # Log the number of settlements
    logger.info(f"Number of settlements: {len(settlements)}")

    # Log the number of unique locations
    unique_regions = set()
    for settlement in settlements:
        new_district = settlement.get("new_district")
        if not new_district:
            logger.warning(f"Settlement without new_district: {settlement.get('name', 'Unknown')}")
            continue
        region = new_district.get("region")
        if region:
            unique_regions.add(region)
    
    logger.info(f"Number of unique regions: {len(unique_regions)}")
    # Log the unique regions
    logger.info("Unique regions:")
    for region in sorted(unique_regions):
        logger.info(region)

def catalog_stats(logger):
    catalog_path = "data/catalog.json"
    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    # Log unieque territory, church_settlement, povit, volost, gmina
    unique_teritories = set()
    unique_church_settlements = set()
    unique_povits = set()
    unique_volosts = set()
    unique_gminas = set()
    for entry in catalog:
        territory = entry.get("territory")
        church_settlement = entry.get("church_settlement")
        povit = entry.get("povit")
        volost = entry.get("volost")    
        gmina = entry.get("gmina")

        if territory:
            unique_teritories.add(territory)
        if church_settlement:
            unique_church_settlements.add(church_settlement)
        if povit:
            unique_povits.add(povit)
        if volost:
            unique_volosts.add(volost)
        if gmina:
            unique_gminas.add(gmina)
    logger.info(f"Unique territories: {len(unique_teritories)}")
    logger.info(sorted(unique_teritories))
    logger.info(f"Unique church settlements: {len(unique_church_settlements)}")      
    logger.info(f"Unique povits: {len(unique_povits)}")
    logger.info(sorted(unique_povits))
    logger.info(f"Unique volosts: {len(unique_volosts)}")
    logger.info(sorted(unique_volosts))
    logger.info(f"Unique gminas: {len(unique_gminas)}")
    logger.info(sorted(unique_gminas))
    #Log the number of entries in the catalog
    logger.info(f"Number of entries in the catalog: {len(catalog)}")

def main():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)

    logger.info("Starting settlements statistics...")
    settlemnts_stats(logger)

    logger.info("Starting catalog statistics...")
    catalog_stats(logger)

    logger.info("Starting geojson statistics...")
    geojson_stats(logger)

if __name__ == "__main__":
    main()