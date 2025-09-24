"""
ocr_full_featured_then_llm.py

Self-contained reimplementation of perform_ocr_on_pdf_enhanced + helpers copied/adapted
from your server_ocr2.py (PaddleCV layout preservation + grouping logic), then sends
the OCR output to an LLM to extract structured product JSON.

Dependencies:
  pip install PyMuPDF opencv-python-headless numpy pillow pytesseract pandas openai paddleocr paddlepaddle
  (paddleocr optional; if missing we fallback to pytesseract)
  Install system Tesseract binary for pytesseract.
Set OPENAI_API_KEY env var to enable LLM step.
"""
import os
import sys
import json
import re
import argparse
from typing import List, Dict, Any, Tuple
import numpy as np
import fitz
import cv2

# pytesseract (fallback)
_have_tesseract = True
try:
    import pytesseract
except Exception:
    _have_tesseract = False


try:
    from paddleocr import PaddleOCR  # will raise if paddleocr/paddlepaddle missing
    _have_paddle = True
except Exception as _paddle_e:
    # import failed — print reason and fall back to basic OCR
    import sys
    print(f"PaddleOCR not available: {_paddle_e}. Falling back to basic OCR.", file=sys.stderr)
    _have_paddle = False


# ----- Paddle instance cache (copied logic) -----
_PADDLE_INSTANCES: Dict[str, Any] = {}
def get_paddle_ocr(lang: str = "en", **kwargs):
    """
    Return a cached PaddleOCR instance.
    The cache key is generated from the language and all other provided keyword arguments,
    ensuring that a unique instance is created for each unique configuration.
    """
    if not _have_paddle:
        raise RuntimeError("PaddleOCR not installed (pip install paddleocr)")

    # Create a stable cache key from all configuration options
    # We sort the items to ensure that the key is consistent regardless of argument order
    config_items = sorted(kwargs.items())
    cache_key = (lang,) + tuple(config_items)

    if cache_key not in _PADDLE_INSTANCES:
        print(f"Initializing new PaddleOCR instance for lang='{lang}' with config: {kwargs}")
        # Pass all the keyword arguments directly to the constructor
        _PADDLE_INSTANCES[cache_key] = PaddleOCR(lang=lang, **kwargs)

    return _PADDLE_INSTANCES[cache_key]


# ----- grouping and product-extraction helpers (copied/adapted) -----
def detect_columns(x_positions: List[float], page_width: float) -> List[float]:
    """Detect column boundaries from x positions using simple clustering."""
    if len(x_positions) < 10:
        return [i * page_width / 3 for i in range(4)]
    x_array = np.array(x_positions)
    sorted_x = np.sort(x_array)
    gaps = np.diff(sorted_x)
    gap_threshold = page_width / 10
    large_gaps = np.where(gaps > gap_threshold)[0]
    boundaries = [0.0]
    for gap_idx in large_gaps:
        boundaries.append((sorted_x[gap_idx] + sorted_x[gap_idx + 1]) / 2.0)
    boundaries.append(page_width)
    if len(boundaries) < 3 or len(boundaries) > 6:
        return [i * page_width / 3 for i in range(4)]
    return sorted(boundaries)


def extract_product_info(blocks: List[Dict]) -> Dict[str, Any]:
    """Extract product info like price and discount from a list of blocks (copied logic)."""
    all_text = []
    price = None
    discount = None
    for block in blocks:
        text = block.get("text", "")
        all_text.append(text)
        # price patterns (DT example common in your code)
        price_match = re.search(r'(\d+[,.]?\d*)\s*DT', text, re.IGNORECASE)
        if price_match and not price:
            price = price_match.group(0)
        discount_match = re.search(r'(\d+)\s*%|économie\s*(\d+)\s*%', text, re.IGNORECASE)
        if discount_match and not discount:
            discount = discount_match.group(0)
    if blocks:
        min_x = min(b["bbox"][0] for b in blocks)
        min_y = min(b["bbox"][1] for b in blocks)
        max_x = max(b["bbox"][2] for b in blocks)
        max_y = max(b["bbox"][3] for b in blocks)
        bbox = [int(min_x), int(min_y), int(max_x), int(max_y)]
    else:
        bbox = [0, 0, 0, 0]
    return {"text": "\n".join(all_text).strip(), "price": price, "discount": discount, "bbox": bbox}


def group_text_blocks_into_products_improved(text_blocks: List[Dict], image_shape: Tuple[int, int]) -> Dict[str, Any]:
    """Improved grouping that handles catalog layouts (copied/adapted)."""
    if not text_blocks:
        return {"products": [], "full_text": ""}

    sorted_blocks = sorted(text_blocks, key=lambda x: (x.get("center_y", 0), x.get("center_x", 0)))
    img_h, img_w = image_shape[0], image_shape[1] if len(image_shape) > 1 else (image_shape[1] if len(image_shape) > 1 else 0)

    x_positions = [b["center_x"] for b in sorted_blocks if "center_x" in b]
    if len(x_positions) > 10:
        col_boundaries = detect_columns(x_positions, img_w)
    else:
        num_cols = 3
        col_width = img_w / num_cols if img_w else 1000
        col_boundaries = [i * col_width for i in range(num_cols + 1)]

    products = []
    row_height = max(1, img_h / 4)

    grid = {}
    for block in sorted_blocks:
        # determine column slot
        cx = block.get("center_x", 0)
        col_idx = 0
        for i in range(len(col_boundaries)-1):
            if col_boundaries[i] <= cx < col_boundaries[i+1]:
                col_idx = i
                break
        else:
            col_idx = max(0, len(col_boundaries)-2)
        row_idx = int(block.get("center_y", 0) / row_height)
        key = (row_idx, col_idx)
        grid.setdefault(key, []).append(block)

    for (row_idx, col_idx), cell_blocks in sorted(grid.items()):
        if not cell_blocks:
            continue
        cell_blocks.sort(key=lambda x: x.get("center_y", 0))
        product_info = extract_product_info(cell_blocks)
        if product_info["text"].strip():
            products.append({
                **product_info,
                "row": row_idx,
                "column": col_idx,
                "block_count": len(cell_blocks)
            })

    full_text_lines = []
    for i, product in enumerate(products):
        if product["text"].strip():
            full_text_lines.append(f"=== PRODUCT {i+1} (Row {product['row']}, Col {product['column']}) ===")
            if product.get("price"):
                full_text_lines.append(f"Price: {product['price']}")
            if product.get("discount"):
                full_text_lines.append(f"Discount: {product['discount']}")
            full_text_lines.append(f"Description: {product['text']}")
            full_text_lines.append("")
    return {"products": products, "full_text": "\n".join(full_text_lines)}


# ----- OCR backends (adapted from server_ocr2.py) -----
def extract_with_paddle(page, language: str, dpi: int, paddle_options: dict) -> Dict[str, Any]:
    """PaddleOCR-based extraction with simple preprocessing & layout grouping."""
    if not _have_paddle:
        raise RuntimeError("PaddleOCR not available; install paddleocr or choose another method.")

    pix = page.get_pixmap(dpi=dpi)
    img_data = pix.tobytes("png")
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Preprocess: denoise -> grayscale -> back to RGB for Paddle
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, h=8)
    enhanced = cv2.cvtColor(denoised, cv2.COLOR_GRAY2RGB)

    ocr = get_paddle_ocr(language, **paddle_options)
    # paddleocr's ocr method returns nested lists; call synchronously
    ocr_result = ocr.ocr(enhanced, cls=True)

    text_blocks = []
    if ocr_result and ocr_result[0]:
        for line in ocr_result[0]:
            box = line[0]
            text_info = line[1]
            text = text_info[0] if isinstance(text_info, (list, tuple)) else (text_info if isinstance(text_info, str) else "")
            conf = text_info[1] if isinstance(text_info, (list, tuple)) and len(text_info) > 1 else None
            if conf is None:
                conf = 1.0
            if conf > 0.5:
                xs = [p[0] for p in box]
                ys = [p[1] for p in box]
                x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
                text_blocks.append({
                    "text": text.strip(),
                    "confidence": float(conf),
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    "center_y": int((y1 + y2) / 2),
                    "center_x": int((x1 + x2) / 2)
                })
    structured = group_text_blocks_into_products_improved(text_blocks, img_rgb.shape)
    return {
        "method": "paddle_ocr",
        "text_blocks": text_blocks,
        "structured_products": structured["products"],
        "text": structured["full_text"],
        "page_width": img_rgb.shape[1],
        "page_height": img_rgb.shape[0]
    }


def extract_with_spatial_pymupdf(page, language: str, dpi: int) -> Dict[str, Any]:
    """PyMuPDF's spatial extraction; fallback to enhanced Tesseract if few blocks found."""
    page_dict = page.get_text("dict")
    structured_blocks = []
    for block in page_dict.get("blocks", []):
        if block.get("type") != 0:
            continue
        block_text = ""
        block_bbox = block.get("bbox", [0, 0, 0, 0])
        for line in block.get("lines", []):
            line_text = ""
            for span in line.get("spans", []):
                line_text += span.get("text", "")
            if line_text.strip():
                block_text += line_text.strip() + "\n"
        if block_text.strip():
            structured_blocks.append({
                "text": block_text.strip(),
                "bbox": [int(x) for x in block_bbox],
                "center_x": int((block_bbox[0] + block_bbox[2]) / 2),
                "center_y": int((block_bbox[1] + block_bbox[3]) / 2),
                "confidence": 1.0
            })
    if len(structured_blocks) < 5:
        # fallback to enhanced tesseract if spatial poor
        return extract_with_enhanced_tesseract(page, language, dpi)
    page_rect = page.rect
    structured = group_text_blocks_into_products_improved(structured_blocks, (int(page_rect.height), int(page_rect.width)))
    return {
        "method": "spatial_pymupdf",
        "text_blocks": structured_blocks,
        "structured_products": structured["products"],
        "text": structured["full_text"],
        "page_width": int(page_rect.width),
        "page_height": int(page_rect.height)
    }


def extract_with_enhanced_tesseract(page, language: str, dpi: int) -> Dict[str, Any]:
    """Enhanced Tesseract that outputs word-level boxes and groups them."""
    pix = page.get_pixmap(dpi=dpi)
    img_data = pix.tobytes("png")
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    tess_lang = language
    if language == "en":
        tess_lang = "eng"
    elif language == "fr":
        tess_lang = "fra"
    elif language == "ar":
        tess_lang = "ara"

    try:
        df = pytesseract.image_to_data(binary, lang=tess_lang, output_type=pytesseract.Output.DATAFRAME)
        df = df[df.conf > 30]
        df = df[df.text.notna()]
        df = df[df.text.str.strip() != ""]
        text_blocks = []
        for _, row in df.iterrows():
            text_blocks.append({
                "text": str(row['text']).strip(),
                "confidence": float(row['conf']) / 100.0,
                "bbox": [int(row['left']), int(row['top']), int(row['left'] + row['width']), int(row['top'] + row['height'])],
                "center_x": int(row['left'] + row['width'] / 2),
                "center_y": int(row['top'] + row['height'] / 2)
            })
        structured = group_text_blocks_into_products_improved(text_blocks, img.shape)
        return {
            "method": "tesseract_enhanced",
            "text_blocks": text_blocks,
            "structured_products": structured["products"],
            "text": structured["full_text"],
            "page_width": img.shape[1],
            "page_height": img.shape[0]
        }
    except Exception as e:
        # on failure, fallback to basic OCR
        print(f"Enhanced Tesseract failed: {e}. Falling back to basic OCR.", file=sys.stderr)
        return extract_with_basic_ocr(page, language, dpi)


def extract_with_basic_ocr(page, language: str, dpi: int) -> Dict[str, Any]:
    """Simple fallback that returns plain text for the page (no blocks)."""
    pix = page.get_pixmap(dpi=dpi)
    img_data = pix.tobytes("png")
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    tess_lang = language
    if language == "en":
        tess_lang = "eng"
    elif language == "fr":
        tess_lang = "fra"
    text = pytesseract.image_to_string(img, lang=tess_lang) if _have_tesseract else ""
    return {
        "method": "tesseract_basic",
        "text_blocks": [],
        "structured_products": [],
        "text": text,
        "page_width": img.shape[1] if img is not None else 0,
        "page_height": img.shape[0] if img is not None else 0
    }


# ----- main perform_ocr_on_pdf_enhanced (synchronous wrapper) -----
def perform_ocr_on_pdf_enhanced(
    file_path: str,
    language: str = "en",
    method: str = "paddle",
    dpi: int = 400,
    paddle_options: dict = None
) -> Dict[str, Any]:
    """
    Main entry: similar behavior to server_ocr2.perform_ocr_on_pdf_enhanced but synchronous.
    Accepts method in {"paddle","spatial","hybrid","tesseract"} and custom paddle_options.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    # Ensure paddle_options is a dictionary
    if paddle_options is None:
        paddle_options = {}

    doc = fitz.open(file_path)
    results = {}
    for page_num in range(len(doc)):
        page = doc[page_num]
        try:
            if method == "paddle" and _have_paddle:
                try:
                    page_result = extract_with_paddle(page, language, dpi, paddle_options)
                except Exception as e:
                    print(f"Paddle failed on page {page_num+1}: {e}. Falling back to spatial.", file=sys.stderr)
                    page_result = extract_with_spatial_pymupdf(page, language, dpi)
            elif method == "spatial":
                page_result = extract_with_spatial_pymupdf(page, language, dpi)
            elif method == "hybrid":
                spatial_result = extract_with_spatial_pymupdf(page, language, dpi)
                if len(spatial_result.get("text", "").strip()) < 100 and _have_paddle:
                    try:
                        page_result = extract_with_paddle(page, language, dpi, paddle_options)
                    except Exception:
                        page_result = spatial_result
                else:
                    page_result = spatial_result
            else:
                # tesseract fallback
                page_result = extract_with_enhanced_tesseract(page, language, dpi)
        except Exception as e:
            # ensure at least basic OCR
            print(f"Page {page_num+1} processing error: {e}. Using basic OCR.", file=sys.stderr)
            page_result = extract_with_basic_ocr(page, language, dpi)
        results[f"page_{page_num+1}"] = page_result
    doc.close()
    return {"pdf_path": os.path.abspath(file_path), "num_pages": len(results), "pages": results}


# ----- simple LLM extraction (optional) -----
def llm_extract_products_from_ocr(ocr_json: Dict[str, Any], openai_model: str = "gpt-4.1", max_tokens: int = 800) -> List[Dict[str, Any]]:
    """
    Send OCR JSON to an LLM asking for strict JSON product list.
    This mirrors earlier PoC logic.
    """
    from openai import AzureOpenAI


    AZURE_KEY = "wpgAi1JyVuZ6vc76jiJ0lzITy8J8SAJH"
    AZURE_ENDPOINT = "https://eyq-incubator.europe.fabric.ey.com/eyq/eu/api"
    API_VERSION = "2023-05-15"
    client = AzureOpenAI(api_key=AZURE_KEY, azure_endpoint=AZURE_ENDPOINT, api_version=API_VERSION)


    system = {
        "role": "system",
        "content": (
        "You are a precise data extraction assistant."
        "Your job: receive the raw OCR output produced by PaddleOCR (or other OCR engines) for every page of a e-catalog PDF of a supermarket, (which wraps PaddleOCR, PyMuPDF, or Tesseract), interpret geometric + textual cues, and return ONLY a JSON ARRAY (top-level) containing one object per product. No prose, no explanation, no markup — only valid JSON.\n\n"
        "--- IMPORTANT: two-source reality (raw OCR vs wrapper normalization)\n"
        "We use a wrapper that may normalize raw OCR output. Expect one of two shapes for each text item:\n"
        "  1) If the backend returned polygon boxes (PaddleOCR): you may see \"poly\": [[x1,y1],[x2,y2],[x3,y3],[x4,y4]] (clockwise) and additionally a normalized axis-aligned bbox computed by the wrapper as \"bbox\": [left,top,right,bottom].\n"
        "  2) If the backend returns simple boxes (Tesseract / PyMuPDF), only \"bbox\" may appear.\n"
        "If both are present, \"poly\" is the original detection polygon and \"bbox\" is the wrapper's axis-aligned bounding box.\n\n"
        "--- INPUT FORMAT YOU WILL RECEIVE (OCR JSON)\n"
        "Top-level: a dict containing pages. Each page object contains:\n"
        "{\n"
        "  \"page_number\": <int>,           # 1-based page number\n"
        "  \"page_width\": <int>,            # rendered image width in pixels\n"
        "  \"page_height\": <int>,           # rendered image height in pixels\n"
        "  \"text_blocks\": [                # detected text blocks / words / lines (order not guaranteed)\n"
        "    {\n"
        "      \"text\": \"...\",            # string content for this block\n"
        "      \"confidence\": <float|null>, # recognition confidence 0.0-1.0 or null if unknown\n"
        "      \"det_conf\": <float|null>,   # OPTIONAL: detection confidence if available (0.0-1.0)\n"
        "      \"rec_conf\": <float|null>,   # OPTIONAL: recognition confidence if available (0.0-1.0)\n"
        "      \"poly\": [[x,y],...],        # OPTIONAL: 4-point polygon from detector (px)\n"
        "      \"bbox\": [L, T, R, B],       # axis-aligned integer bbox in pixels (left, top, right, bottom)\n"
        "      \"center_x\": <int>,          # OPTIONAL: wrapper may provide center; if absent compute as (L+R)/2\n"
        "      \"center_y\": <int>,\n"
        "      \"words\": [                  # OPTIONAL: word-level boxes (may be missing)\n"
        "         {\"word\":\"...\",\"left\":int,\"top\":int,\"width\":int,\"height\":int,\"conf\":float|null}, ...\n"
        "      ]\n"
        "    }, ...\n"
        "  ],\n"
        "  \"structured_products\": [ ... ]  # OPTIONAL: pre-grouped product candidates created by the wrapper\n"
        "}\n\n"
        "Coordinate system:\n"
        "- origin (0,0) is the top-left of the rendered page image.\n"
        "- All polygon and bbox coordinates are pixels in that coordinate system.\n"
        "- \"bbox\" is axis-aligned and is [left, top, right, bottom] with left < right and top < bottom.\n\n"
        "Confidence notes:\n"
        "- There are two related confidences: detection confidence (det_conf) and recognition confidence (rec_conf).\n"
        "- If only one confidence field is supplied, treat it as the recognition confidence.\n"
        "- Confidence values should be treated as calibration hints only — prefer higher-confidence text when resolving conflicts, but do not blindly trust them.\n\n"
        "--- WHAT THE WRAPPER GUARANTEES (so LLM can rely on it):\n"
        "1) If the detector returns a polygon, the wrapper will include it under \"poly\" and also provide a computed axis-aligned \"bbox\" for convenience.\n"
        "2) All bbox coordinates are integers. All centers (center_x/center_y) are integers when present; if not present you may compute them as (left+right)//2 and (top+bottom)//2.\n"
        "3) \"words\" is optional and may not be present for PaddleOCR unless a word-level pass is requested.\n"
        "4) \"structured_products\" is optional and may be empty; if provided it represents wrapper-level groupings you may reuse but should still validate by geometry.\n\n"
        "--- GEOMETRY RULES YOU MAY USE (explicit):\n"
        "- Column detection: cluster on center_x values; columns are vertical slices of the page.\n"
        "- Use axis-aligned bbox centers for proximity computations. If both poly and bbox exist, use bbox for spatial association and poly only for tight overlap checks.\n"
        "- Use L1 or Euclidean distance between centers to break ties; consider vertical overlap and bbox size (height) as tie-breakers.\n\n"
        "--- PRICE / TOKEN HANDLING (unchanged rules from caller, but explicitly reinforced):\n"
        "- Price tokens can be split across blocks/words. When concatenating numeric groups, preserve reading order by sorting candidate numeric fragments by their center_y then center_x (top-to-bottom, left-to-right) before joining.\n"
        "- Remove currency letters (DT, TND, etc.) before normalizing digits; keep decimals only if explicit.\n\n"
            
    """--- STRICT OUTPUT SCHEMA (REQUIRED)
    Return a JSON array of product objects exactly like the following keys. Each object MUST contain **all keys** in the schema. Use `null` for unknown/missing values.

    [
    {
        "Brand": <string|null>,
        "Product": <string|null>,                 # product name + short description (combine title + description)
        "Rayon": <string|null>,                   # product aisle/category inferred from the product
        "Famille": <string|null>,                 # product family inferred from product title/description
        "Sous-famille": <string|null>,            # product sub-family inferred from title/description
        "Grammage": <string|null>,                # weight string if available, e.g. "Le paquet de 100g" or "500g", else null
        "Price Before (TND)": <string|null>,      # original price before promo if shown; string numeric with comma thousands, no currency symbol (e.g. "1,599"), else null
        "Price After (TND)": <string|null>,       # current price shown (after discount if applicable); string numeric with comma thousands, no currency symbol; DO NOT CALCULATE IT
        "URL": null,
        "promo_date_debut": null,
        "promo_date_fin": null
    },
    ...
    ]

    Field rules:
    - All price fields must be strings (digits and optional commas for thousands separators). Do NOT include currency symbols. Example valid formats: "8,460", "1,599", "12.50" (only if decimals appear in text).
    - If only one price is shown and there is also a percent discount nearby, assume that single price is the current price (Price After) and set Price Before to null unless an explicit "before" price is present.
    - If two prices are shown close to each other and context indicates one is original and one is discounted, then set Price Before to original and Price After to discounted. If ambiguous, use spatial proximity to the main product title/description (closest bbox).
    - NEVER compute price arithmetic (do not compute discounted price from percentage). Only copy the price explicitly shown on the page into the correct field.
    - URL, promo_date_debut, promo_date_fin must always be null unless explicit URLs/dates are clearly and fully present on the page (rare). For this PoC, prefer null.

    --- PRICE PARSING & NORMALIZATION RULES (critical)
    Catalog OCR is noisy; your parsing MUST follow these rules to normalize messy price tokens:

    1. Extract digit sequences from the nearby text fragments. If digits are split across tokens (examples: "35," + "900 DT", "17DT800", "17 DT 800"), concatenate the numeric digit groups in reading order to form a single integer-like sequence before inserting separators.  
    - Example: "35, 900 DT" or "35 900 DT" or "35,900 DT" → digits "35900" → format "35,900".  
    - Example: "17DT800" → digit groups "17" and "800" → combine → 17800 → format "17,800".

    2. Remove non-digit currency letters (DT, TND, USD, €, $) from the numeric digits when normalizing; currency is TND for Price fields in our schema, but do not append "TND" to the value — keep the value numeric-looking only.

    3. Keep decimals if the text clearly includes decimals (e.g., "12.50" or "12,50" — convert "12,50" to "12.50" if it looks like a decimal number). For thousands use commas in the output: e.g., 12450 → "12,450". If decimals exist, keep decimal point.

    4. Discount percent: if a percent token like "20%" or "20 %", or the French "20 pourcent" appears near a price, capture discount_pct as a numeric (e.g., 20) and also ensure current price is set in "Price After (TND)". Do NOT apply the discount arithmetic to produce Price After — Price After must be the price explicitly shown.

    5. When multiple numeric tokens appear near an item, use geometric proximity (bbox overlap or center distance) to decide which number is the item price. If multiple are equally close, prefer the one with higher OCR confidence or the larger font (inferred by larger bbox height).

    --- SPATIAL ASSOCIATION RULES (how to associate price/title/brand)
    - Use bbox overlap and vertical proximity: price may appear ABOVE or BELOW the product title/description or even inside the same layout box; do NOT assume price is always below title.  
    - Primary association algorithm (apply in order):
    1. If a structured product grouping is already provided in OCR JSON (structured_products), use its items as candidates.
    2. Otherwise, for each text block that looks like a product title (short, possibly uppercase, near bold text), find numeric price tokens in blocks whose bbox centers are within the same column range and within ±50% of the title block height vertically. Consider both blocks above and below the title.
    3. Prefer price tokens that share the same column (detect columns by clustering block center_x values).
    4. If a candidate price is found inside the exact same bbox as the title block, it belongs to that product.
    5. If two or more price tokens are in close proximity, attach the closest one to the product. Use confidence and bbox size as tie-breakers.

    - Brand extraction:
    - Brand is typically adjacent to or above the product title and often uppercase. If a capitalized short token appears in a block near the title (same bbox or immediately above), use it as Brand; otherwise set Brand to null.
    - If multiple candidate brands exist, prefer the one with higher confidence or closer bbox.

    - Product (title + description):
    - Compose the Product field by concatenating the title and the most relevant descriptive lines in reading order within the product's bbox or grouped cells.
    - Remove extraneous footer/header/store text (e.g., page numbers, store name repeated on every page) if it appears in every page header/footer region.

    - Rayon / Famille / Sous-famille:
    - These are inferred categorical fields. Use product name and short description to infer them using common retail taxonomy (examples: "Électroménager", "Épicerie Sucrée", "Boissons", "Fruits & Légumes", "Hygiène", "Climatiseurs", "Biscuits", etc.). If unsure, prefer a conservative (higher-level) Rayon and set Famille/Sous-famille to null or to a plausible family name. Example inference (follow examples given to you).

    - Grammage:
    - If weight/size tokens exist (e.g., "100g", "1kg", "500 mL", "Le paquet de 100g"), capture as a string exactly as it appears or normalized to "<number>g" style if clearly stated. If absent, set null.

    --- MESSY TOKEN EXAMPLES (how to handle)
    - "35, 900 DT" → Price After (TND): "35,900"
    - "17DT800 20%" → Price After (TND): "17,800", Discount percent: 20 (Note: your schema does not include discount_pct column — do not output discount_pct in final table; just ensure Price Before/Price After are set correctly. If discount percent affects which value is Price After vs Price Before, follow spatial rules.)
    - "35," + "900" on separate lines but vertically adjacent: combine to "35,900".

    --- COMPLETENESS & EXACTNESS (MANDATORY)
    - The model must **not** skip items. If up to 200 items are present in the catalog pages, you must produce up to 200 product objects — one per detected product. Do not omit products or invent products. Every product detected in the OCR input must appear once in the output array. If you are uncertain whether two blocks are the same product, still output both with best-effort fields (use null for uncertain fields).
    - The LLM must avoid inventing prices, brands, rayon, or grammage. If data is not on the page, use `null` rather than guessing.
    - If a product appears duplicated on the page (e.g., catalog repeats), include each occurrence as a separate object.

    --- OUTPUT FORMAT RULES (strict)
    - Output MUST be valid JSON that parses with `json.loads()` / `JSON.parse()` — no commentary, no extra text, no markdown.
    - Top-level must be a JSON array. Each item must be an object exactly with the keys defined in the REQUIRED SCHEMA (Brand, Product, Rayon, Famille, Sous-famille, Grammage, Price Before (TND), Price After (TND), URL, promo_date_debut, promo_date_fin).
    - Use `null` for unknown values. For string values, trim whitespace.
    - Use commas as thousands separators in Price fields (e.g., "17,800"), no currency symbol, decimals only if explicitly present on the page.

    --- EXAMPLES (valid outputs for two example products)
    Example A:
    {
    "Brand": "CONDOR",
    "Product": "Climatiseur CS09 AL44T3 (9000 BTU, Garantie 3 ans, compresseur 6 ans)",
    "Rayon": "Électroménager",
    "Price Before (TND)": "1,599",
    "Price After (TND)": "1,339",
    "Famille": "Climatiseurs",
    "Sous-famille": "Climatiseurs fixes",
    "Grammage": null,
    "URL": null,
    "promo_date_debut": null,
    "promo_date_fin": null
    }

    Example B:
    {
    "Brand": "BAHLSEN",
    "Product": "Biscuits au beurre Leibniz Minis",
    "Rayon": "Épicerie Sucrée",
    "Price Before (TND)": "8,460",
    "Price After (TND)": "8,460",
    "Famille": "Biscuits",
    "Sous-famille": "Biscuits au beurre",
    "Grammage": "Le paquet de 100g",
    "URL": null,
    "promo_date_debut": null,
    "promo_date_fin": null
    }

    --- FINAL INSTRUCTIONS (enforce strict behavior)
    1. Produce ONLY the final JSON array. Nothing else.
    2. Be exhaustive and include every product detected in the provided OCR JSON input.
    3. Do not invent data. Use `null` where information is absent or ambiguous.
    4. Normalize price strings as specified (concatenate split digit groups, remove currency letters, insert commas for thousands).
    5. Use geometric rules (bbox centers, overlap, column detection) to associate price with the correct product; price can be above or below the title and may be inside the same layout box.
    6. If the OCR confidence is very low (all nearby blocks < 0.3), still output the product but set uncertain fields to null.
    7. The output must be parseable JSON and exactly follow the schema above.

    If you understand these rules, process the OCR input and return the JSON array of product objects only.
    """
        )
    }
    user = {"role": "user", "content": "OCR JSON:\n\n" + json.dumps(ocr_json)}
    resp = client.chat.completions.create(
                                        model=openai_model, 
                                        messages=[system, user], 
                                        temperature=0.0, 
                                        # max_tokens=max_tokens
                                    )
    
    assistant_text = resp.choices[0].message.content
    try:
        parsed = json.loads(assistant_text)
        return parsed
    except Exception:
        # salvage first top-level array substring
        txt = assistant_text.strip()
        first = txt.find("[")
        last = txt.rfind("]")
        if first != -1 and last != -1 and last > first:
            return json.loads(txt[first:last+1])
        raise RuntimeError("LLM did not return valid JSON: " + assistant_text)


def process_pdf_file(pdf_path):
    """Process a single PDF file and return the JSON result"""
    METHOD = "spatial"
    DPI = 400
    LANG = "en"

    # --- RECOMMENDED CONFIGURATION FOR QUALITY & SPEED ON CPU ---
    import multiprocessing
    cpu_cores = multiprocessing.cpu_count()

    paddle_config = {
        "ocr_version": "PP-OCRv4",
        "use_textline_orientation": False,
        "text_recognition_batch_size": cpu_cores,
        "dipshit" : True,
    }

    if not os.path.exists(pdf_path):
        return {"ok": False, "error": "file not found", "path": pdf_path}

    try:
        ocr_out = perform_ocr_on_pdf_enhanced(
            pdf_path,
            language=LANG,
            method=METHOD,
            dpi=DPI,
            paddle_options=paddle_config
        )
    except Exception as e:
        return {"ok": False, "error": "OCR failed", "detail": str(e)}

    try:
        res = llm_extract_products_from_ocr({"ok": True, "ocr": ocr_out}, openai_model="gpt-4.1", max_tokens=10000)
        return {"ok": True, "products": res}
        # json.dumps(res, ensure_ascii=False, indent=2)
    except Exception as e:
        return {"ok": False, "error": "LLM extraction failed", "detail": str(e)}

# Keep your original main() function for standalone testing
def main():
    PDF_PATH = r"C:\Users\VM764NY\Downloads\catalogue-special_froid.pdf"
    
    # If called with a command line argument, use that instead
    if len(sys.argv) > 1:
        PDF_PATH = sys.argv[1]
    
    result = process_pdf_file(PDF_PATH)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()