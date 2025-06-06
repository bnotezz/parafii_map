import json
import re
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def normalize_territory(territory: str) -> str:
    # прибираємо суфікс "губернія" або "губ."
    return re.sub(r'\s*губерн(?:ія|\.?)$', '', territory).strip()

def match_entry(catalog_entry, locations):
    name = catalog_entry['church_settlement']
    page = catalog_entry['page']
    territory = normalize_territory(catalog_entry['territory'])
    povit = catalog_entry.get('povit', '')
    volost = catalog_entry.get('volost', catalog_entry.get('gmina', ''))

    # 1) первинний фільтр за назвою та сторінкою
    candidates = locations_by_name(locations, name, page)
    if not candidates:
        # Якщо name містить дужки, витягуємо слова перед і в дужках
        match = re.match(r'^(.*?)\s*\((.*?)\)$', name)
        if match:
            primary_name, secondary_name = match.groups()
            candidates = locations_by_name(locations, primary_name, page)
            # Якщо не знайшли за primary_name, пробуємо secondary_name
            if not candidates:
                candidates = locations_by_name(locations, secondary_name, page)

    if len(candidates) > 1: 
        # Якщо candidates містять правильну сторінку, фільтруємо за нею
        page_candidates = [
            loc for loc in candidates
            if page in loc.get('pages', [])
        ]

        if page_candidates: 
            candidates = page_candidates

    # 2) якщо ще більше одного — historic_district ⊇ povit
    if len(candidates) > 1 and povit:
        candidates = [
            loc for loc in candidates
            if povit.lower() in loc.get('historic_district', '').lower()
        ]
    # 3) якщо ще більше одного — historic_district ⊇ volost
    if len(candidates) > 1 and volost:
        def has_volost(loc):
            hd = loc.get('historic_district', '').lower()
            return (volost.lower() in hd) 
        candidates = [loc for loc in candidates if has_volost(loc)]
    # 4) якщо більше одного — фільтруємо historic_district ⊇ territory
    if len(candidates) > 1:
        candidates = [
            loc for loc in candidates
            if territory.lower() in loc.get('historic_district', '').lower()
        ]

    if not candidates:
        logger.warning(f"No match for {name} (page {page})")
        return None
    if len(candidates) > 1:
        logger.warning(f"Multiple matches for {name} (page {page}): picking first")
    result = candidates[0]

    if not result.get('location'):
        logger.warning(f"No coordinates found for {name} (page {page})")
        return None

    return result

def locations_by_name(locations, name, page):
    candidates = [
        loc for loc in locations
        if loc.get('name') == name and any(p in loc.get('pages', []) for p in (page, page + 1, page - 1))
    ]

    # 1.1) якщо не знайшли, пробуємо old_district
    if not candidates:
        candidates = [
            loc for loc in locations
            if loc.get('old_district', {}).get('name') == name and any(p in loc.get('pages', []) for p in (page, page + 1, page - 1))
        ]
        
    return candidates

def build_parafii_locations(catalog_path, locations_path, output_path):
    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)
    with open(locations_path, 'r', encoding='utf-8') as f:
        locations = json.load(f)

    parafii = []

    for entry in catalog:
        loc = match_entry(entry, locations)
        if loc is None:
            # Skip entries that do not match any location
            logger.warning(f"No matching location for {entry['church_settlement']}")
            continue
        coords = loc['location']
        if not coords:
            # Skip entries without coordinates
            logger.warning(f"No coordinates found for {entry['church_settlement']} (page {entry['page']})")
            continue

        new_district = loc.get('new_district')    
        if not new_district:
            logger.warning(f"No new_district found for {entry['church_settlement']}")
        
        old_district = loc.get('old_district')    
        if not old_district:
            logger.warning(f"No old_district found for {entry['church_settlement']}")
       

        info = {
            'id': entry['id'],
            'title': entry['parafiya'],
            'church': entry['church'],
            'church_settlement': entry.get('church_settlement', ''),
            'religion': entry['religion'],
            'territory': entry['territory'],
            'povit': entry.get('povit', ''),
            'volost': entry.get('volost', entry.get('gmina', '')),
            'settlements': entry['settlements'],
            'osm_id': loc.get('osm_id'),
            'location': coords,
            'old_district': loc.get('old_district', {}),
            'new_district': loc.get('new_district', {}),
            'historic_district': loc.get('historic_district', ''),
        }

        parafii.append(info)


    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(parafii, f, ensure_ascii=False, indent=2)
    logger.info(f"Wrote {len(parafii)} records to {output_path}")

if __name__ == '__main__':
    build_parafii_locations(
        catalog_path='data/catalog.json',
        locations_path='data/settlements_locations.json',
        output_path='data/parafii_locations.json'
    )
