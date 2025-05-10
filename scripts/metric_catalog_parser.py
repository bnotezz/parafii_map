import re
import json
import logging
import warnings
import pdfplumber

# Completely suppress all pdfplumber warnings
logging.getLogger('pdfminer').setLevel(logging.ERROR)
# More specific warning filters
warnings.filterwarnings('ignore', category=UserWarning, message='.*CropBox.*')
warnings.filterwarnings('ignore', category=UserWarning, message='.*MediaBox.*')
warnings.filterwarnings('ignore', category=UserWarning, message='.*Viewing.*')

def inflect_label(value: str, label: str) -> str:
    if label in ("povit", "rayon"):
        return re.sub(r"ого$", "ий", value)
    if label in ("volost", "gmina"):
        return re.sub(r"ої$", "а", value)
    return value

def slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r'[^a-z0-9\u0400-\u04FF]+', '-', s)
    return re.sub(r'-{2,}', '-', s).strip('-')

def normalize_fond(raw: str) -> str:
    m = re.match(r'(.+?)\s*[–-]\s*(\d+)', raw)
    if m:
        return f"{m.group(1).strip()} – {m.group(2)}"
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
    data["church_settlement"] = settlement.strip()
    raw_label = tokens[j-1]

    if kind.startswith("повіт"):
        data["povit"] = inflect_label(raw_label, "povit")
        if j + 2 < len(tokens):
            region_raw, kind2 = tokens[j+1], tokens[j+2].lower()
            if "волост" in kind2:
                data["volost"] = inflect_label(region_raw, "volost")
            elif "гмін" in kind2:
                data["gmina"] = inflect_label(region_raw, "gmina")
    elif kind.startswith("район"):
        data["rayon"] = inflect_label(raw_label, "rayon")

    return data

def parse_segment(seg: str, page: int, fld: str, logger) -> dict:
    """
    Розбирає один метричний сегмент виду:
      '1930–1935, 1937–1938: ф. Р – 740, оп. 9, спр. 157'
    years = '1930–1935, 1937–1938'
    """
    if ':' not in seg:
        logger.warning(f"Can't split years/rest in '{seg}' (page {page})")
        return {}
    raw_years, rest = seg.split(':', 1)
    years = re.sub(r'\s*[–-]\s*', '–', raw_years.strip())

    # fond
    fond_m = re.search(r'ф\.?\s*([^\s,;]+)', rest, flags=re.IGNORECASE)
    # opys
    opys_m = re.search(r'оп\.?\s*(\d+)', rest, flags=re.IGNORECASE)
    # book (спр.)
    book_m = re.search(r'спр\.?\s*(\d+)', rest, flags=re.IGNORECASE)
    # fallback: last number if book_m missing
    book_val = None
    if not book_m and opys_m:
        nums = re.findall(r'\b(\d+)\b', rest)
        if nums:
            last = nums[-1]
            if last != opys_m.group(1):
                book_val = last

    result = {"years": years}
    if fond_m:
        result["fond"] = normalize_fond(fond_m.group(1))
    if opys_m:
        result["opys"] = opys_m.group(1)
    if book_m:
        result["book"] = book_m.group(1)
    elif book_val:
        result["book"] = book_val

    if not (fond_m and opys_m and (book_m or book_val)):
        logger.warning(f"Incomplete parse of '{seg}' → {result} (page {page}, field {fld})")
    return result

def parse_pdf_catalog(pdf_path: str) -> list:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    logger = logging.getLogger(__name__)

    religions = {
        "православ": "orthodox",
        "римо-католиц": "roman_catholic",
        "греко-католиц": "greek_catholic",
        "лютеран": "lutheran",
        "іудаїзм": "judaism"
    }

    key_map = {
        1: "territory", 2: "church", 3: "parafiya",
        4: "settlements", 5: "births", 6: "marriages",
        7: "divorces", 8: "deaths"
    }

    record_field_map = {
        "Книга шлюбних опитувань": "marriage_inquiries",
        "Списки парафіян":         "parish_lists",
        "Припинення шлюбу":        "marriage_terminations",
        "Шлюбні обшуки":           "marriage_inspections"
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
            for raw in text.split("\n"):
                line = raw.strip()
                if not line or line == str(pnum):
                    continue

                # detect religion
                low = line.lower()
                for ukr, eng in religions.items():
                    if ukr in low:
                        current_religion = eng
                        logger.info(f"Religion → {eng} (page {pnum})")
                        break
                else:
                    m = re.match(r"^(\d+)\.\s*(.+)$", line)
                    if m:
                        idx, val = int(m.group(1)), m.group(2).strip()
                        last_idx = idx
                        last_record_field = None

                        if idx == 1:
                            block = {"religion": current_religion, "page": pnum}
                            missing = set(key_map.keys())

                        if idx in key_map:
                            if idx == 5:
                                val = re.sub(r"^Народження:\s*", "", val)
                            elif idx == 6:
                                val = re.sub(r"^Шлюб:\s*", "", val)
                            elif idx == 7:
                                val = re.sub(r"^Розлучення:\s*", "", val)
                            elif idx == 8:
                                val = re.sub(r"^Смерть:\s*", "", val)
                            if val and not val.lower().startswith("інформація відсутня"):
                                block[key_map[idx]] = val
                            missing.discard(idx)

                        elif idx in (9, 10):
                            for ukr, eng in record_field_map.items():
                                if val.startswith(ukr + ":"):
                                    content = val[len(ukr)+1:].strip()
                                    if content and not content.lower().startswith("інформація відсутня"):
                                        block[eng] = content
                                        last_record_field = eng
                                    break
                            else:
                                if not val.lower().startswith("інформація відсутня"):
                                    logger.warning(f"Unparsed record idx={idx} p={pnum}: «{val}»")
                        else:
                            logger.warning(f"Unexpected idx={idx} p={pnum}: «{val}»")

                        if idx == 10:
                            pf = block.get("parafiya", "").strip()
                            if not pf:
                                logger.warning(f"Empty parafiya in block starting on page {pnum}")
                            else:
                                block.update(parse_parafiya(pf, pnum, logger))

                            for fld in METRIC_FIELDS:
                                raw = block.get(fld)
                                if not raw:
                                    block.pop(fld, None)
                                    continue
                                segs = [s.strip() for s in raw.replace('\n',' ').split(";") if s.strip()]
                                parsed_list = []
                                for seg in segs:
                                    item = parse_segment(seg, pnum, fld, logger)
                                    if item:
                                        parsed_list.append(item)
                                if parsed_list:
                                    block[fld] = parsed_list
                                else:
                                    block.pop(fld, None)

                            block["id"] = slugify(block.get("parafiya", ""))

                            if missing:
                                logger.warning(f"Missing fields {sorted(missing)} in block starting on page {pnum}")
                            entries.append(block)
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
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(catalog)} entries to {output_json}")
