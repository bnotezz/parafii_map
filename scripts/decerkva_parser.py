"""
Парсер даних з Інтернет-каталогу "Дерев'яні Церкви Західної України"
http://decerkva.org.ua

Цей скрипт витягує інформацію про дерев'яні церкви Західної України, включаючи:
- Назву населеного пункту
- Назву церкви
- URL сторінки з описом
- Географічні координати (широту і довготу)

Дані організовані за ієрархією:
область -> район -> населений пункт -> церква

Результати зберігаються у JSON файл з структурою, що відповідає цій ієрархії.
"""

import re
import json
import requests
import logging
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from typing import Optional, Tuple

MAIN_URL = "http://decerkva.org.ua/"

BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "http://decerkva.org.ua/",
  "Origin": "http://decerkva.org.ua"
}


def get_lat_lng(url: str) -> Optional[Tuple[float, float]]:
    """
    Extract latitude and longitude from a Google Maps URL.

    Parameters
    ----------
    url : str
        A full Google Maps URL such as
        'https://www.google.com/maps/@51.2797501,26.2977239,267m/data=!3m1!1e3'.

    Returns
    -------
    (lat, lng) : tuple[float, float] | None
        A tuple containing (latitude, longitude) if the pattern is found,
        otherwise `None`.
    """
    match = re.search(r'@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),', url)
    if match:
        lat, lng = map(float, match.groups())
        return lat, lng
    return None

def download_html_page(full_url, logger):
    try:
        response = requests.get(full_url, headers=BROWSER_HEADERS, timeout=10)
        response.raise_for_status()
        # Specify the website charset to Windows-1251 to fix parsing issues
        response.encoding = "windows-1251"
        html_content = response.text
    except requests.RequestException as e:
        logger.error(f"Failed to download HTML content from {full_url}: {e}")
        return None

    soup = BeautifulSoup(html_content, 'html.parser')
    if not soup:
        logger.error(f"Failed to parse HTML content from {full_url}")
        return None
    return soup


def parse_settlement_page(full_url, title, logger):
    logger.info(f"Parsing region page: {title} ({full_url})")
    
    soup = download_html_page(full_url, logger)
    if soup is None:
        logger.error(f"download_html_page returned None for {full_url}")
        return None

    # Use select_one to get the first matching element
    b_tag = soup.select_one(".ws36 b")
    if not b_tag:
        logger.warning(f"No church name found for settlement: {title}")
        return None
    
    church_name = b_tag.get_text(strip=True)

    settlement = {
        "name": title,  
        "church_name": church_name,
        "url": full_url
    }

    map_url = soup.select_one("a[href*='maps']")
    if not map_url or not map_url.get("href"):
        logger.warning(f"No map URL found for settlement: {title}")
    else:
        lat_lng = get_lat_lng(map_url.get("href"))
        if not lat_lng:
            logger.warning(f"Could not extract lat/lng from map URL: {map_url.get('href')} for settlement: {title}")
            lat_lng = (None, None)
        else:
            logger.info(f"Extracted lat/lng for settlement {title}: {lat_lng}")
            settlement["location"] = lat_lng

    return settlement


def parse_district_page(full_url, title, logger):
    logger.info(f"Parsing region page: {title} ({full_url})")
    soup = download_html_page(full_url, logger)

    district = {district: title, "settlements": []}
    for a in soup.select(".ws28 a"):
        settelement_title = a.get_text(strip=True)
        if not settelement_title:
            continue
        href = a.get("href")
        if not href:
            continue
        if "menu" in href:
            continue

        full_settlement_url = urljoin(full_url, href) if full_url else href

        settlement = parse_settlement_page(full_settlement_url, settelement_title, logger)
        if settlement:
            district["settlements"].append(settlement)

    if not district["settlements"]:
        logger.warning(f"No settlements found for district: {title}")
        return None
    logger.info(f"Parsed district: {title} with {len(district['settlements'])} settlements")
    return district

def parse_region_page(full_url, title, logger):
    logger.info(f"Parsing region page: {title} ({full_url})")
    soup = download_html_page(full_url, logger)

    region = {"region": title, "districts": []}   

    for a in soup.select(".ws28:has(~ .ws26) a"):
        district_title = a.get_text(strip=True)
        href = a.get("href")
        if not href:
            continue
        if "menu" in href:
            continue
        full_district_url = urljoin(full_url, href) if full_url else href
        
        district = parse_district_page(full_district_url, district_title, logger)
        if district:
            region["districts"].append(district)
    if not region["districts"]:
        logger.warning(f"No districts found for region: {title}")
        return None
    logger.info(f"Parsed region: {title} with {len(region['districts'])} districts")
    return region
    

def parse_decerkva_data(logger):
    logger.info("Starting to parse decerkva data...")

    soup = download_html_page(MAIN_URL, logger)
    
    records = []
    for a in soup.select(".ws28 a"):
        title = a.get_text(strip=True)
        if "область" not in title:
            continue                        # ← equivalent to the .filter()

        href = a.get("href")
        if not href:
            continue                        # skip <a> without an href

        full_url = urljoin(MAIN_URL, href) if MAIN_URL else href

        region = parse_region_page(full_url, title, logger)
        if region:
            records.append(region)
    logger.info(f"Parsed {len(records)} regions with churches.")
    return records

    

def main():
    output_file = "data/decerkva.json"
    logging.basicConfig(level=logging.WARNING, format='%(asctime)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)
    logger.info("Starting decerkva data parsing...")
    
    churches = parse_decerkva_data(logger)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(churches, f, ensure_ascii=False, indent=4)
    print(f"Decerkva data saved to {output_file}")

if __name__ == "__main__":
    main()