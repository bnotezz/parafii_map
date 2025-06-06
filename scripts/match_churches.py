#!/usr/bin/env python3
"""
Map churches from `parafii_locations.json` to those in `decerkva.json`.

Matching rules
--------------
1. **Region / Oblast** must match *ignoring the word “область”*.
2. **District / Raion** must match *ignoring the word “район”*.
3. **Settlement** names may differ slightly (fuzzy match; ≥ 0.85
   `difflib.SequenceMatcher` ratio).
4. **Church** names are compared after:
     * removing the word “церква” (and its abbreviations “ц.”),
     * lower-casing,
     * stripping punctuation,
     * dropping very common stop-words (e.g. “пресвятої”, “богородиці” …).
   A match is accepted if the sets of key words share **at least one
   common word of length ≥ 4**.

The script prints the result list as JSON (and can optionally save it
to `matches.json`).
"""

import json
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List, Tuple
import logging

# --------------------------------------------------------------------------- #
# Helpers                                                                     #
# --------------------------------------------------------------------------- #

_STOP_WORDS = {
    "св", "свв", "святої", "святого", "свято", "пресвятої", "пр", "прсв",
    "богородиці", "божої", "господнього", "икони", "ікони", "честного", "чесного",
    "воздвиження", "собору"
}

_RX_PUNCT = re.compile(r"[^\w\s]", flags=re.U)


def _strip_suffix(text: str, suffix: str) -> str:
    """Remove suffix (e.g. 'область', 'район') and trim."""
    return re.sub(fr"\s*{suffix}\s*$", "", text.strip(), flags=re.I)


def _normalize(txt: str) -> str:
    """Lower-case, remove punctuation, collapse spaces."""
    txt = _RX_PUNCT.sub(" ", txt.lower())
    return re.sub(r"\s+", " ", txt).strip()


def _settlement_sim(a: str, b: str) -> float:
    """Fuzzy similarity between two settlement names."""
    return SequenceMatcher(None, _normalize(a), _normalize(b)).ratio()


def _church_keywords(name: str) -> List[str]:
    """Return significant words (≥4 chars, not stop-words, no 'церква')."""
    name = re.sub(r"\bцеркв[аюи]?\b", " ", name, flags=re.I)
    words = [_normalize(w) for w in name.split()]
    return [w for w in words if len(w) >= 4 and w not in _STOP_WORDS]


def _church_match(words_a: List[str], words_b: List[str]) -> bool:
    """True if there is at least one common keyword."""
    return bool(set(words_a) & set(words_b))


# --------------------------------------------------------------------------- #
# Load data                                                                   #
# --------------------------------------------------------------------------- #




# Flatten decerkva → one record per settlement
# decerkva_flat: List[Dict] = []
# for reg in decerkva_regions:
#     region_clean = _strip_suffix(reg["region"], "область")
#     for dist in reg["districts"]:
#         district_clean = _strip_suffix(dist["district"], "район")
#         for stl in dist["settlements"]:
#             decerkva_flat.append({
#                 "region": region_clean,
#                 "district": district_clean,
#                 "settlement": stl["name"],
#                 "church": stl["church_name"],
#                 "location": stl["location"],
#             })

# --------------------------------------------------------------------------- #
# Matching                                                                    #
# --------------------------------------------------------------------------- #

#matches: List[Dict] = []

# for p in parafii:
#     # 1. region / district must match exactly (sans suffixes)
#     p_region = _strip_suffix(p["old_district"]["oblast"], "область")
#     p_district = _strip_suffix(p["old_district"]["rayon"], "район")
#     p_settlement = p["old_district"]["name"]

#     # Candidate decerkva entries in the same oblast & raion
#     cand: List[Tuple[Dict, float]] = []
#     for d in decerkva_flat:
#         if d["region"] != p_region or d["district"] != p_district:
#             continue
#         sim = _settlement_sim(p_settlement, d["settlement"])
#         if sim >= 0.85:
#             cand.append((d, sim))

#     if not cand:
#         continue  # no settlement candidate ⇒ no match

#     # For each candidate, check church name keywords overlap
#     p_words = _church_keywords(p["church"])
#     for d, _ in cand:
#         d_words = _church_keywords(d["church"])
#         if _church_match(p_words, d_words):
#             matches.append({
#                 "parafia": p["church"],
#                 "parafia_settlement": f"{p['old_district']['oblast']} область, "
#                                       f"{p['old_district']['rayon']} район, "
#                                       f"{p_settlement}",
#                 "decerkva_settlement": f"{d['region']} {d['district']} {d['settlement']}",
#                 "decerkva": d["church"],
#                 "location": d["location"],
#             })
#             break  # assume at most one match per parafia

def find_matches(parafii_file, decerkva_file, logger):
    matches = {}
    # Load settlements JSON data
    with open(parafii_file, "r", encoding="utf-8") as f:
        parafii = json.load(f)

    # Load decerkva JSON data
    with open(decerkva_file, "r", encoding="utf-8") as f:
        decerkva_regions = json.load(f)

    # Flatten decerkva → one record per settlement

    for parafia in parafii:
       

        parafia_oblast = _strip_suffix(parafia.get("old_district", {}).get("oblast", ""), "область")
        parafia_rayon = _strip_suffix( parafia.get("old_district", {}).get("rayon", ""), "район")

        if( not parafia_oblast or not parafia_rayon):
            logger.warning(f"Skipping parafia {parafia['church']} due to missing oblast or rayon.")
            continue
        # Find matching region and district in decerkva

        for region in decerkva_regions:
            region_name = _strip_suffix(region["region"], "область")
            if region_name != parafia_oblast:
                continue
            for district in region["districts"]:
                district_name = _strip_suffix(district["district"], "район")
                if( district_name != parafia_rayon):
                    continue
                # Now we are in the right region and district
                for settlement in district["settlements"]:
                    settlement_name = _strip_suffix(settlement["name"], "село")
                    if parafia["old_district"]["name"].lower() in settlement_name.lower():
                        # Found matching settlement

                        # Check church name
                        if "церква" in settlement["church_name"].lower():
                            if "костел" in parafia["church"].lower():
                                continue
                            if parafia["religion"] == "judaism":
                                continue


                        # check if matches contains parafia by parafia id
                        if parafia["id"] not in matches:
                            matches[parafia["id"]] = []
                        
                        match = { 
                            "parafia": parafia["church"],
                            "parafia_settlement": f"{parafia_oblast} область "
                                                  f"{parafia_rayon} район "
                                                  f"{parafia['old_district']['name']}",
                            "decerkva_settlement": f"{region_name} область {district_name} район {settlement_name}",
                            "decerkva": settlement["church_name"],
                            "location": settlement["location"]
                        }
                        matches[parafia["id"]].append(match)
                        logger.info(f"Match found: {parafia['church']} in {parafia_oblast} {parafia_rayon} "
                                    f"matches {settlement_name} in {region_name} {district_name}")
                        # Assuming we want only one match per parafia
                        # If you want all matches, remove the break 
                        #break
    logger.info(f"Found {len(matches)} matches.")
    return matches



def main():
    parafii_file = "data/parafii_locations.json"
    decerkva_file = "data/decerkva.json"
    output_file = "data/cerkva_matches.json"
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)
    logger.info("Starting decerkva data matching...")
    
    matches = find_matches(parafii_file,decerkva_file,logger)

    # Save matches to JSON file
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(matches, f, ensure_ascii=False, indent=4)
    print(f"Mathed data saved to {output_file}")

    # Save matches to CSV file
    csv_output_file = "data/cerkva_matches.csv"
    with open(csv_output_file, "w", encoding="utf-8") as f:
        f.write("id,parafia,parafia_settlemen,decerkva_settlement,decerkva,lat,lon\n")
        for parafia_id, match_list in matches.items():
            for match in match_list:
                if(match['location'] is None):
                    logger.warning(f"Skipping match for parafia {parafia_id} due to missing location.")
                    continue
                f.write(f"{parafia_id},"
                        f"{match['parafia']},"
                        f"{match['parafia_settlement']},"
                        f"{match['decerkva_settlement']},"
                        f"{match['decerkva']},"
                        f"{match['location'][0]},"
                        f"{match['location'][1]}\n")

if __name__ == "__main__":
    main()