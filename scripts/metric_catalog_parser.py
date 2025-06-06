import re
import json
import logging
import warnings
import pdfplumber
import hashlib

# Completely suppress all pdfplumber warnings
logging.getLogger('pdfminer').setLevel(logging.ERROR)
warnings.filterwarnings('ignore', category=UserWarning, message='.*CropBox.*')
warnings.filterwarnings('ignore', category=UserWarning, message='.*MediaBox.*')
warnings.filterwarnings('ignore', category=UserWarning, message='.*Viewing.*')

def inflect_label(value: str, label: str) -> str:
    if label in ("church_settlement", "settlement"):
        return re.sub(r'^(?:с\.|смт|с-ще|м\.|м,|м-ко)\.?\s*', "", value)
    if label in ("povit"):
        return re.sub(r"ого$", "ий", value)
    if label in ("volost", "gmina"):
        return re.sub(r"ої$", "а", value)
    return value


def slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r'[^a-z0-9Ѐ-ӿ]+', '-', s)
    return re.sub(r'-{2,}', '-', s).strip('-')

def generate_short_id(text: str, length: int = 8) -> str:
    """Generate a short unique ID based on input text using SHA-256"""
    if not text:
        return ""
    # Create SHA-256 hash of the input text
    hash_object = hashlib.sha256(text.encode())
    # Take first 'length' characters of the hexadecimal representation
    return hash_object.hexdigest()[:length]

def normalize_fond(raw: str) -> str:
    m = re.match(r'(.+?)\s*[–-]\s*(\d+)', raw)
    if m:
        return f"{m.group(1).strip()}–{m.group(2)}"
    return raw.strip()


def parse_parafiya(pf: str, page: int, logger) -> dict:
    original = pf
    root = pf.split("/")[0].strip()
    if "," not in root:
        logger.warning(f"parafiya missing comma: '{original}' (page {page})")
        return {}
    church_part, rest = root.split(",", 1)
    church = church_part.strip()
    tokens = rest.strip().split()

    j = next((
        i for i, tk in enumerate(tokens)
        if re.match(r'повіт', tk.lower()) or re.match(r'район', tk.lower())
    ), None)
    if j is None:
        logger.warning(f"parafiya missing 'повіт'/'район': '{original}' (page {page})")
        return {"church": church}

    data = {"church": church}
    kind = tokens[j].lower()
    settlement = " ".join(tokens[: j-1])
    data["church_settlement"] = inflect_label(settlement.strip(),"church_settlement")
    raw_label = tokens[j-1]

    if kind.startswith("повіт"):
        data["povit"] = inflect_label(raw_label, "povit")
        if j + 2 < len(tokens):
            region_raw, kind2 = tokens[j+1], tokens[j+2].lower()
            if "волост" in kind2:
                data["volost"] = inflect_label(region_raw, "volost")
            elif "гмін" in kind2:
                data["gmina"] = inflect_label(region_raw, "gmina")

    return data


def parse_segment(seg: str, page: int, fld: str, logger) -> dict:

    # Split on first ':' only, to preserve commas in the year list
    if ':' not in seg:
        logger.warning(f"Can't split years/rest in '{seg}' (page {page})")
        return {}

    raw_years, rest = seg.split(':', 1)
    raw_years = raw_years.strip()
    rest     = rest.strip()

    # Normalize dashes and preserve commas
    years = re.sub(r'\s*[–-]\s*', '–', raw_years)
    # Validate format: YYYY, YYYY–YYYY, or comma-separated thereof
    yrs_pattern = r'^\d{4}(?:\s*[–-]\s*\d{4})?(?:\s*,\s*\d{4}(?:\s*[–-]\s*\d{4})?)*$'
    if not re.match(yrs_pattern, years):
        logger.warning(f"Invalid years format '{years}' in '{seg}' (page {page})")

    fond_m = re.search(r'ф\.?\s*([^,;]+)', rest, flags=re.IGNORECASE)
    opys_m = re.search(r'оп\.?\s*(\d+)', rest, flags=re.IGNORECASE)
    book_m = re.search(r'спр\.?\s*(\d+)', rest, flags=re.IGNORECASE)

    result = {"years": years}
    if fond_m:
        result["fond"] = normalize_fond(fond_m.group(1).strip())

    # determine opys_val
    opys_val = None
    if opys_m:
        opys_val = opys_m.group(1)
    else:
        nums = re.findall(r'\b(\d+)\b', rest)
        # remove fond number
        if fond_m:
            f_num = re.search(r'(\d+)', fond_m.group(1))
            if f_num:
                nums = [n for n in nums if n != f_num.group(1)]
        # remove book number
        if book_m:
            nums = [n for n in nums if n != book_m.group(1)]
        if nums:
            opys_val = nums[0]
    if opys_val:
        result["opys"] = opys_val

    # determine book_val
    book_val = None
    if book_m:
        book_val = book_m.group(1)
    else:
        nums2 = re.findall(r'\b(\d+)\b', rest)
        if fond_m:
            f_num = re.search(r'(\d+)', fond_m.group(1))
            if f_num:
                nums2 = [n for n in nums2 if n != f_num.group(1)]
        if opys_val:
            nums2 = [n for n in nums2 if n != opys_val]
        if nums2:
            book_val = nums2[-1]
    if book_val:
        result["book"] = book_val

    if not ("fond" in result and "opys" in result and "book" in result):
        logger.warning(f"Incomplete parse of '{seg}' → {result} (page {page}, field {fld})")
    return result


def parse_parafiya_block(block,pnum, logger,METRIC_FIELDS,missing):
    # Parse the parafiya block
    pf_page = block.get("page", pnum)
    pf = block.get("parafiya", "")
    if pf:
        block.update(parse_parafiya(pf, pf_page, logger))
    for fld in METRIC_FIELDS:
        raw_val = block.get(fld)
        if not raw_val:
            block.pop(fld, None)
            continue
        segs = [s.strip() for s in raw_val.split(";") if s.strip()]
        parsed = [parse_segment(seg, pf_page, fld, logger) for seg in segs]
        block[fld] = [item for item in parsed if item]

    #block["id"] = slugify(block.get("parafiya",""))
    block["id"] = generate_short_id(block.get("parafiya", ""))

    if missing:
        logger.warning(f"Missing fields {sorted(missing)} in block starting on page {pf_page}")

    # validate the block
    if not block.get("church_settlement"):
        logger.warning(f"Missing church_settlement in block starting on page {pf_page}")
    if not block.get("povit"):
        logger.warning(f"Missing povit in block starting on page {pf_page}")
    if not block.get("id"):
        logger.warning(f"Missing id in block starting on page {pf_page}")

    return block


def parse_pdf_catalog(pdf_path: str) -> list:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    logger = logging.getLogger(__name__)

    religions = {
        "православ’я": "orthodox",
        "римо-католицизм": "roman_catholic",
        "римо – католицизм": "roman_catholic",
        "греко-католицизм": "greek_catholic",
        "греко – католицизм": "greek_catholic",
        "лютеранство": "lutheran",
        "іудаїзм": "judaism"
    }

    key_map = {
        1: "territory", 2: "church", 3: "parafiya",
        4: "settlements", 5: "births", 6: "marriages",
        7: "divorces", 8: "deaths"
    }

    record_field_map = {
        "Книга шлюбних опитувань":   "marriage_inquiries",
        "Списки парафіян":           "parish_lists",
        "Припинення шлюбу":          "marriage_terminations",
        "Шлюбні обшуки":             "marriage_inspections"
    }

    METRIC_FIELDS = ["births", "marriages", "deaths", "divorces"] + list(record_field_map.values())

    entries = []
    current_religion = None
    block = {}
    missing = set()
    last_idx = None
    last_record_field = None

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            pnum = page.page_number
            text = page.extract_text() or ""
            lines = text.splitlines()
            for raw in lines:
                line = raw.strip()
                if line == str(pnum) or not line:
                    continue

                low = line.lower()

                if not any(char.isdigit() for char in line):
                    if last_idx == 10:
                        # finalize the previous block
                        pf_block = parse_parafiya_block(block, pnum, logger, METRIC_FIELDS, missing)
                        if(pf_block):
                            entries.append(pf_block)
                        block = {}
                        last_idx = None
                        last_record_field = None

                    religion_record = False
                    for ukr, eng in religions.items():
                        if ukr.lower() == low.strip():
                            current_religion = eng
                            logger.info(f"Religion → {eng} (page {pnum})")
                            religion_record = True
                            break
                    
                    if religion_record:
                        continue
                
                m = re.match(r"^(\d+)\.\s*(.+)$", line)
                if m:
                    idx, val = int(m.group(1)), m.group(2).strip()
                    if idx == 1 and last_idx == 10:
                        # finalize the previous block
                        pf_block = parse_parafiya_block(block, pnum, logger, METRIC_FIELDS, missing)
                        if(pf_block):
                            entries.append(pf_block)
                        block = {}
                        last_idx = None
                        last_record_field = None
                    last_idx = idx
                    last_record_field = None

                    if idx == 1:
                        block = {"religion": current_religion, "page": pnum}
                        missing = set(key_map.keys())

                    if idx in key_map:
                        if idx in (5,6,7,8):
                            val = re.sub(r"^[^:]+:\s*", "", val)
                        if val and not val.lower().startswith("інформація відсутня"):
                            block[key_map[idx]] = val
                        missing.discard(idx)

                    elif idx in (9,10):
                        if val and not val.lower().startswith("інформація відсутня"):
                            for ukr, eng in record_field_map.items():
                                if val.startswith(ukr + ":"):
                                    content = val[len(ukr)+1:].strip()
                                    if content:
                                        last_record_field = eng
                                        block[eng] = content
                                    break
                        elif last_idx == 10:
                            # finalize the previous block
                            pf_block = parse_parafiya_block(block, pnum, logger, METRIC_FIELDS, missing)
                            if(pf_block):
                                entries.append(pf_block)
                            block = {}
                            last_idx = None
                            last_record_field = None
                else:
                    if last_idx in key_map and key_map[last_idx] in block:
                        block[key_map[last_idx]] += " " + line
                    elif last_record_field and last_record_field in block:
                        block[last_record_field] += " " + line

    return entries

if __name__ == "__main__":
    input_pdf  = "data/source/Каталог метричних книг, що зберігаються в Державному архіві Рівненської області.pdf"
    output_json = "data/catalog.json"

    catalog = parse_pdf_catalog(input_pdf)
    # Validate the catalog
    # Check if id is unique
    ids = set()
    for entry in catalog:
        if "id" in entry:
            if entry["id"] in ids:
                print(f"Duplicate id found: {entry['id']}")
            else:
                ids.add(entry["id"])
        else:
            print(f"Missing id in entry: {entry}")

    
    print(f"Number of entries in the catalog: {len(catalog)}")

    # Save the catalog to a JSON file
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(catalog)} entries to {output_json}")
