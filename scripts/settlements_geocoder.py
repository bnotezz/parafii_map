import json
import time
import requests

# Overpass API endpoint
url = "http://overpass-api.de/api/interpreter"


def chunk_list(data, chunk_size):
    """Yield successive chunks of size chunk_size from data."""
    for i in range(0, len(data), chunk_size):
        yield data[i:i + chunk_size]

def find_nodes_by_osm_ids(osm_ids):
    """
    Find nodes by their OSM IDs using Overpass API.
    """
    # Ensure the list of IDs is not empty
    if not osm_ids:
        print("No OSM IDs provided.")
        return []
    
    # Build the query string; note the comma-separated list of IDs
    query = "[out:json];\nnode(id:{});\nout skel;".format(",".join(map(str, osm_ids)))
    
    # Make the request to Overpass API
    response = requests.get(url, params={'data': query})

    if response.status_code == 200:
        data = response.json()
        return data['elements']
    else:
        print("Error fetching data:", response.status_code)
        return []

def update_settlements_locations(settlements):
    """
    Process a list of settlements in chunks, make an HTTP POST request for each chunk,
    and update each settlement with the location data returned from the API.
    
    Args:
        settlements (list): List of settlement names.
        api_url (str): URL of the API endpoint to get location data.
    
    Returns:
        list: List of dictionaries with updated settlement data.
    """
    updated_settlements = []
    for group in chunk_list(settlements, 20):
        # Prepare payload; adjust the key names if required by the API.
        osm_ids = [settlement.get("osm_id") for settlement in group]
        if not osm_ids:
            print("No OSM IDs found in the group.")
            continue
        # Make the API call to get location data
        nodes = find_nodes_by_osm_ids(osm_ids)
        if not nodes:
            print("No nodes found for the provided OSM IDs.")
            continue
        # Process the nodes to extract location data
        for settlement in group:
            #settlement["location"] = None
            # Check if the settlement has a corresponding node
            for node in nodes:
                if node and 'id' in node and str(node['id']) == settlement.get("osm_id"):
                    # Extract the location data from the node
                    settlement["location"] = [node['lon'], node['lat']]
                    break
            
            if not settlement.get("location"):
                print(f"No location found for settlement with OSM ID: {settlement.get('osm_id')}")

            updated_settlements.append(settlement)

    return updated_settlements

def main():
    settlements_file = "data/settlements_locations.json"
    output_file = "data/settlements_locations.json"

    # Load settlements JSON data
    with open(settlements_file, "r", encoding="utf-8") as f:
        settlements = json.load(f)

    updated_settlements = update_settlements_locations(settlements)

    # Save updated settlements to a new JSON file
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(updated_settlements, f, ensure_ascii=False, indent=2)

    print(f"Updated settlements with details code saved to {output_file}")

if __name__ == "__main__":
    main()
