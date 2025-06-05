import re
import json
import logging

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


def parafii_geojson_stats(logger):
    geojson_path = "data/parafii.geojson"
    with open(geojson_path, 'r', encoding='utf-8') as f:
        parafii = json.load(f)

    # Log the number of features in the geojson
    logger.info(f"Number of features in the geojson: {len(parafii['features'])}")
    # Log the number of unique locations
    unique_locations = set()
    # Hash map for unique locations by osm_id and list of fetures with the same osm_id
    osm_id_map = {}
    for feature in parafii['features']:
        osm_id = feature.get("properties", {}).get("osm_id")
        if osm_id:
            feature_info = {
                'id': feature['properties']['id'],
                'location': feature['properties'].get('location',""),
                'title': feature['properties']['title']
            }
            if osm_id not in osm_id_map:
                osm_id_map[osm_id] = []
            osm_id_map[osm_id].append(feature_info)

    logger.info(f"Number of unique locations: {len(osm_id_map)}")

    # Log the number of features with the same osm_id
    for osm_id, features in osm_id_map.items():
        if len(features) > 1:
            logger.info(f"Multiple features with the same osm_id {osm_id}: {len(features)}")
            for feature in features:
                logger.info(f"Feature: {feature['location']} {feature['title']} (id: {feature['id']})")
    

def main():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)

    logger.info("Starting settlements statistics...")
    settlemnts_stats(logger)

    logger.info("Starting catalog statistics...")
    catalog_stats(logger)

    logger.info("Starting parafii geojson statistics...")
    parafii_geojson_stats(logger)

if __name__ == "__main__":
    main()