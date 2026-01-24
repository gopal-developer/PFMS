# PFMS Summary Report Generator - Copilot Instructions

## Project Overview
PFMS (Public Financial Management System) filter application processes financial expenditure data from Indian research institutions under the **National Quantum Mission (NQM)**. It transforms raw PFMS Excel exports into institute-wise and TG-wise (Technology Group) summaries with automated report generation (Excel/PDF/Word).

**Domain Context**: T-Hub (Samgnya Technologies Foundation) manages expenditure tracking for multiple Technology Groups (TG1-TG4) across partner institutions (IIT, IISc, etc.).

---

## Architecture Pattern: Two-Stage Pipeline

The app processes files through **two sequential filtering operations** (not one):

1. **Stage 1 - `process_option1()`**: Filters raw PFMS Excel by hardcoded agency code `TNCH00009452` (Hybrid Agency)
   - Extracts rows 12-13 as multi-level headers, data starts row 14
   - Returns: Intermediate Excel BytesIO buffer

2. **Stage 2 - `process_option2()`**: Creates child agency summary from Stage 1 output
   - Performs complex data transformations: grant type classification, TG mapping, aggregations
   - Returns: Multi-sheet Excel + JSON preview data for frontend
   - **Key outputs**: 
     - `institute_split`: Institute-wise Recurring vs Non-Recurring breakdown
     - `tg_summary_table`: TG-aggregated totals with Grand Total row
     - `thub_summary`: T-Hub-specific expenditure (uses separate column logic)

**Critical files saved to disk during `/process`**:
- `uploads/intermediate_filtered.xlsx` (deleted post-processing)
- `uploads/final_output.xlsx` (retained for `/download`)

---

## Data Transformation Specifics

### Multi-Level Header Handling
- Headers span rows 12-13 using `pd.MultiIndex.from_tuples()`
- Flattening: `" ".join([str(a), str(b)]).replace("nan", "").strip()`
- Search column patterns via `.lower()` matching (e.g., "child" + "agency" detection)

### Grant Type Classification
Detects `(G)` suffix = "Recurring", `(C)` suffix = "Non-Recurring", else "Unknown"
- Uses `.apply(grant_type)` function with regex cleanup

### Metadata Extraction
- **Financial Year**: Scans first 20 rows, looks for "financial year" + date pattern like `(FY YYYY-YYYY)`
- **Dates**: Searches "from date" / "to date" labels, extracts numeric value from adjacent columns
- Debug prints to console show extraction process

### T-Hub Special Logic
Separate columns: `self_limit`, `self_success`, `self_pending`
- Formula: `T-Hub Balance = self_limit - (self_success + self_pending)`
- Only included if sanction column non-empty AND grant type ≠ "Unknown"

### TG Mapping
Hardcoded dictionary maps normalized institution names to TG1-TG4:
```python
TG_MAP = {
    "IITP": "TG4", "CDACT": "TG1", "CDOT": "TG2", ...
}
normalize_name(x) = upper(x).replace(" ", "").replace("-", "").replace(",", "")
```
Unmapped institutions → empty TG string.

---

## API Routes & Workflows

| Route | Method | Purpose | Output |
|-------|--------|---------|--------|
| `/` | GET | Serve HTML upload UI | `index.html` |
| `/process` | POST | Run both filter stages, return preview | JSON: success + preview data |
| `/download` | GET | Download processed `final_output.xlsx` | Excel file |
| `/download-tg-pdf` | POST | Generate TG-specific PDF report | PDF bytes |
| `/download-tg-tables` | POST | TG data in Excel/PDF/Word | Multiple formats |
| `/download-thub-tables` | POST | T-Hub data in Excel/PDF/Word | Multiple formats |
| `/download-all-documents` | POST | Combined T-Hub + TG + comparison tables | Multiple formats |

**Error Handling**: `/process` returns traceback on 500 error; front-end catches and displays.

---

## Frontend-Backend Data Contract

Frontend sends POST data (JSON) with **specific shape expected**:

### TG/T-Hub Download Payloads
```json
{
  "format": "excel|pdf|word",
  "data": [
    {"TG": "TG1", "Child Agency Name": "...", "Expenditure Limit": 0, ...},
    ...
  ]
}
```

### All-Documents Payload
```json
{
  "format": "excel|pdf|word",
  "thubTgs": {"thubData": true, "thubFundsReleased": 0, ...},
  "thubTotals": {"total_funds_released": 0, ...},
  "tgDetails": [{"title": "TG1", "columns": [...], "rows": [...]}]
}
```

---

## Development Workflow

### Running Locally
```bash
pip install -r requirements.txt
python app.py  # Flask dev server, debug=True
# Navigate to http://localhost:5000
```

### Testing File Processing
1. Prepare test XLSX: Raw PFMS export with rows 1-11 (metadata), rows 12-13 (headers), row 14+ (data)
2. Upload via UI → `/process` → Preview tables → Download
3. Check `final_output.xlsx` sheets: "Institute-Exp Rec vs Non-Rec", "T-Hub-Exp Rec vs Non-Rec", "Overall Rec vs Non-Rec"

### Common Modifications
- **Change agency filter**: Modify `search_text = "TNCH00009452"` in `process_option1()`
- **Adjust TG mappings**: Update `TG_MAP` dict and normalize logic in `process_option2()`
- **Column detection**: Inspect Excel header patterns and update `.lower()` matching rules in required_cols/thub_cols loops
- **Report styling**: Edit `header_format`, `num_format` variables in Excel generation blocks

---

## Key Dependencies & Versions
- **Flask**: Web framework (routes, file uploads via Werkzeug)
- **pandas**: Data transformations, multi-index handling, pivots
- **openpyxl**: Excel workbook creation/styling
- **reportlab**: PDF generation with tables
- **python-docx**: Word document generation
- **werkzeug**: `secure_filename()` for uploads

---

## Important Conventions

1. **Column searches are case-insensitive** via `.lower()` but pattern matching is fragile—inspect actual file headers
2. **Numeric conversions**: `pd.to_numeric(..., errors="coerce").fillna(0)` to handle malformed cells
3. **File cleanup**: Input & intermediate files deleted; only `final_output.xlsx` persists for download
4. **Currency formatting**: Use `f"{value:,.2f}"` throughout (Excel and PDFs)
5. **Excel sheet order matters**: Order specified explicitly via `to_excel()` and sheet creation loops

---

## Debugging Tips
- Enable Flask debug output: Check console for "Processing Step 1/2" and "DEBUG: Extracting ..." messages
- Inspect uploaded file structure: Read first 20 rows without headers to see metadata layout
- Check column detection: Print matched column names during `process_option2()` initialization
- Validate TG mapping: Ensure institution names match TG_MAP keys after normalization
- Test format generation independently: Call `generate_tg_excel()` etc. with sample data
