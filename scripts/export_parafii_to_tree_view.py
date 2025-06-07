import csv
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_tree_view(parafii_path):
    with open(parafii_path, 'r', encoding='utf-8') as f:
        parafii = json.load(f)
    
    regions = []
    for parafia in parafii:
        new_district = parafia.get('new_district',{})
        region = "Інші"
        rayon = "Інші"
        hromada = "Інші"
        settlement = "Інші"
        if new_district:
            # Extract region and district from new_district
            region = new_district.get('region', 'Інші')
            rayon = new_district.get('rayon', 'Інші')
            hromada = new_district.get('hromada', 'Інші')
            settlement = new_district.get('name', 'Інші')

        # Find or create region
        region_node = next((r for r in regions if r['name'] == region), None)
        if not region_node:
            region_node = {'name': region, 'districts': []}
            regions.append(region_node)

        # Find or create rayon
        rayon_node = next((r for r in region_node["districts"] if r['name'] == rayon), None)
        if not rayon_node:
            rayon_node = {'name': rayon, 'hromadas': []}
            region_node["districts"].append(rayon_node)

         # Find or create hromada
        hromada_node = next((r for r in rayon_node["hromadas"] if r['name'] == hromada), None)
        if not hromada_node:
            hromada_node = {'name': hromada, 'settlements': []}
            rayon_node["hromadas"].append(hromada_node)

         # Find or create settlement
        settlement_node = next((r for r in hromada_node["settlements"] if r['name'] == settlement), None)
        if not settlement_node:
            settlement_node = {'name': settlement, 'parafii': []}
            hromada_node["settlements"].append(settlement_node)

        # Add parafia to settlement
        settlement_node['parafii'].append({
            "id": parafia['id'], 
            "title": parafia['title'],
            "settlements": parafia['settlements'],
            "location": parafia['location'],
            "religion": parafia['religion']
        })

    return regions


def main():
    parafii_path='data/parafii_locations.json'
    output_path='data/parafii_tree.json'

    tree_vew = generate_tree_view(parafii_path)

    if( not tree_vew):
        logger.error("No parafii found in the provided file.")
        return
    logger.info(f"Generated tree view with {len(tree_vew)} regions.")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(tree_vew, f, ensure_ascii=False, indent=4)

    logger.info(f"Tree view saved to {output_path}")


if __name__ == "__main__":
    main()