import re
import json
import logging
import csv
import requests

url = "http://overpass-api.de/api/interpreter"

def find_settlement_churches(node_id, logger,retry=2):
    """
    Find churches by settlement ID using Overpass API.
    """
    # Ensure the settlement ID is not empty
    if not node_id:
        print("No OSM IDs provided.")
        return []
    
    # Build the query string; note the comma-separated list of IDs
    query =f"""[out:json];
    node({node_id})->.target;
    .target;
    is_in;

    area._["place"~"^(city|town|village|hamlet)$"]->.search_area;

    (
    node(area.search_area)["amenity"="place_of_worship"]["religion"~"^(christian|orthodox)$",i];
    way(area.search_area)["amenity"="place_of_worship"]["religion"~"^(christian|orthodox)$",i];
    relation(area.search_area)["amenity"="place_of_worship"]["religion"~"^(christian|orthodox)$",i];
    way(area.search_area)["building"="church"];
    relation(area.search_area)["building"="church"];
    )->.churches;
        .churches out center tags qt;
    """
    try:
        logger.debug(f"Querying Overpass API for node ID: {node_id}")
        # Make the request to Overpass API
        response = requests.get(url, params={'data': query}, timeout=30)

        if response.status_code == 200:
            data = response.json()
            #logger.debug(f"Successfully fetched data for node ID: {node_id}")   
            logger.debug(f"Response data: {data}") 
            logger.debug(f"Full query sent: {query}")
            logger.debug(f"Response text: {response.text}")
            if 'elements' not in data:
                logger.warning(f"No elements found in response for node ID: {node_id}")
                return []
            return data['elements']
        else:
            logger.error(f"Error fetching data: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        if retry > 0:
            logger.warning(f"Request failed, retrying... ({retry} attempts left)")
            return find_settlement_churches(node_id, logger, retry=retry-1)
        logger.error(f"Request failed: {e}")
        return []

def parafii_settlements(logger):
    parafii_path = "data/parafii_locations.json"
    with open(parafii_path, 'r', encoding='utf-8') as f:
        parafii_data = json.load(f)

    locations_mapping_path='data/locations_mapping.csv'
    with open(locations_mapping_path, 'r', encoding='utf-8') as f:
        locations_mapping = {row['id']: row for row in csv.DictReader(f)}
    
    settlements = {}
    for parafia in parafii_data:
        if locations_mapping.get(parafia.get('id')):
            continue

        new_district = parafia.get("new_district")
        if not new_district:
            logger.warning(f"Parafia without new_district: {parafia.get('title', 'Unknown')}")
            continue

        osm_id = parafia.get("osm_id")
        if not osm_id:
            logger.warning(f"Parafia without osm_id: {parafia.get('title', 'Unknown')}")
            continue

        # if not parafia.get("religion","") != "orthodox":
        #     continue

        katotth = new_district.get("katotth")
        if katotth:
            settlement = settlements.get(katotth, {"parafii": [], "osm_id": osm_id, "new_district": new_district,"old_district": parafia.get("old_district")})
            settlement["parafii"].append({"title": parafia.get("title", "Unknown"), "id": parafia.get("id", "Unknown")})

            settlements[katotth] = settlement

    return settlements

def main():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)

    settlements = parafii_settlements(logger)
    output = []
    for katotth, settlement_info in settlements.items():
        #if len(settlement_info["parafii"]) != 1:
        #    continue
        node_id = settlement_info.get("osm_id")
        if not node_id:
            logger.warning(f"No OSM ID for settlement: {settlement_info['new_district'].get('name', 'Unknown')}")
            continue
        churches = find_settlement_churches(node_id, logger)
        if not churches:
            logger.info(f"No churches found for settlement: {settlement_info['new_district'].get('name', 'Unknown')}")
            continue
        output.append({
            "katotth": katotth,
            "churches": churches,
            "settlement_info": settlement_info
        })

        # for church in churches:
        #     name = church.get('tags', {}).get('name', 'Unknown')
        #     church_type = church.get('tags', {}).get('amenity') or church.get('tags', {}).get('building', 'Unknown')
        #     lat = church.get('lat') or church.get('center', {}).get('lat')
        #     lon = church.get('lon') or church.get('center', {}).get('lon')
        #     logger.info(f"  Church: {name}, Type: {church_type}, Location: ({lat}, {lon})")

    output_path = "data/temp_settlement_churches.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    logger.info(f"Wrote {len(output)} records to {output_path}")


if __name__ == "__main__":
    main()