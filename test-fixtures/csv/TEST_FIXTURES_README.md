# Dotloop Reporter — CSV Test Fixtures

Generated June 26, 2026. Drop these into a `test-fixtures/csv/` folder in the repo so Claude Code and Cowork can reference them by path during development. None of this is real data — all loop IDs, names, and addresses are synthetic.

These fall into three buckets: **good** (should parse cleanly, exercise different export shapes), **messy** (should parse but trigger hygiene warnings), and **bad** (should fail validation outright, with a clear error message rather than a crash or silent garbage).

---

## Good files — different export configurations, all should auto-map cleanly

### `good_full_export.csv`
Comprehensive "kitchen sink" export — every optional section present (Financials, Listing Information, Geographic Description, Offer Dates, full granular Property Address breakout). Consistent ISO dates throughout, no currency/percent symbols, consistent lowercase booleans, **no conflicts** between duplicate-concept columns (top-level Listing Date matches nested Listing Information/Listing Date on every row; Lead Source matches Referral/LEAD SOURCE on every row). 8 rows spanning Sold, Under Contract, Active Listing, Pending, and Archived statuses.

**Use for:** the happy-path end-to-end test. If this doesn't parse and map every column correctly, nothing else will.

### `good_minimal_export.csv`
Only 7 columns — Loop ID, Loop Name, Loop Status, Address, Price, Created By, Closing Date. No Financials, no Property details, no Tags.

**Use for:** confirming the pipeline doesn't choke or over-warn when most optional columns are simply absent. Should produce a high field-completeness score on the columns that exist, and clearly show (not warn about) the columns that were never part of this export.

### `good_brokerage_style_export.csv`
Mirrors the real `Demo_Brokerage_Data_2025.csv` structure: flatter granular Property Address columns (no Full Address, no MLS Number, no Parcel/Tax ID), includes `Company Information / office managing broker` and `Net to Office` (not present in other files). **Deliberately uses `$`/`%`/comma-formatted values** ("$455,000.00", "3%") — this is exactly how that real file came formatted.

**Use for:** value-normalization testing (strip `$`, strip `,`, strip `%`, parse to number) on an otherwise clean, well-structured file.

### `good_composite_address_only.csv`
**Only** has the composite "Address 1" (`"9 Liberty St"`) and "Address 2" (`"Hamilton, OH 45011"`) columns — no granular `Property Address / City`, `Property Address / Street Name`, etc. at all.

**Use for:** the composite-address-parsing fallback path. This is the one case where the parser has no choice but to split the composite fields itself.

---

## Messy file — valid CSV structure, deliberately dirty values

### `messy_data_hygiene_issues.csv`
Has a junk title line (`Messy Test Export 2025`) before the real header row — same pattern as the real `2025_final.csv`. 11 data rows, **each isolating exactly one hygiene issue** so test assertions can target a specific row:

| Row | Loop ID | Issue |
|---|---|---|
| 1 | 61900001 | Baseline — `Created By Admin` = `"TRUE"` (uppercase) |
| 2 | 61900002 | `Created By Admin` = `"false"` (lowercase) — **inconsistent casing vs row 1** |
| 3 | 61900003 | `Price` = `"$425,000.00"` — **currency symbol + comma**, inconsistent with bare-number rows |
| 4 | 61900004 | `Financials / Sale Commission Rate` = `"3%"` — **percent symbol**, inconsistent with bare-number rows |
| 5 | 61900005 | **Conflict**: top-level `Listing Date` = `2025-08-08`, nested `Listing Information / Listing Date` = `08/15/2025` — different dates, not just different format |
| 6 | 61900006 | **Conflict**: `Lead Source / Lead Source` = `Zillow`, `Referral / LEAD SOURCE` = `Realtor.com` |
| 7 | 61900007 | `Loop Name` is blank — **required field missing** |
| 8 | 61900008 | `Price` = `"-50000"` — **negative price**, data-entry error |
| 9 | 61900009 | `Address` = `"   909 Test Row 9...   "` — **leading/trailing whitespace** |
| 10 | 61900001 | **Duplicate Loop ID** — same ID as row 1, different data entirely |
| 11 | (blank) | **Fully blank row** — every cell empty, same column count as header |

**Use for:** the validation/hygiene-guidance layer. This file should produce a long, specific list of warnings — not a crash, not silent data loss. Each row's issue should map to one distinct, human-readable warning in the validation report.

---

## Non-Dotloop file — different vendor entirely

### `non_dotloop_generic_export.csv`
A completely different header vocabulary (`MLS #`, `List Price`, `Listing Agent`, `Buyer Agent`, `Beds`, `Baths`, `Sqft`) — no "Section / Field" naming convention at all. Represents a hand-exported MLS sheet or a different transaction-management tool.

**Use for:** the generic fuzzy-matching fallback (approved direction: Dotloop-specific first, generic fallback second). If the Dotloop alias table finds zero matches, this is what should trigger fuzzy matching instead of failing outright.

---

## Bad files — should fail validation cleanly, not crash

### `bad_header_only.csv`
Full header row, **zero data rows**.

**Expected behavior:** a clear "no data rows found" error — not a successful import of 0 records, and not an unhandled exception.

### `bad_ragged_rows.csv`
4 rows against a 7-column header: row 1 has only 4 fields (too few), row 3 has 10 fields (too many — extra trailing values), rows 2 and 4 are correctly formed.

**Expected behavior:** the malformed rows should be flagged individually with their row number, while the well-formed rows still import. Should not silently shift columns or corrupt data on the ragged rows.

### `bad_not_actually_csv.csv`
Literal HTML content (a 404 error page) saved with a `.csv` extension — simulates someone accidentally saving a failed export's error page.

**Expected behavior:** immediate rejection at the file-validation stage ("this doesn't look like a CSV file") — before any parsing is attempted.

---

## Suggested test coverage checklist

- [ ] All 4 "good" files map every column to a canonical field with zero unrecognized columns (except intentionally-unmapped ones like `Car / other_terms`)
- [ ] `good_composite_address_only.csv` correctly derives city/state/zip/street fields from the composite columns
- [ ] `good_brokerage_style_export.csv` correctly strips `$`, `,`, and `%` and parses to numeric values
- [ ] `messy_data_hygiene_issues.csv` produces exactly 11 distinct warnings, one per documented issue above, with no false positives on the rows not listed
- [ ] The two conflicting-duplicate-column rows (5 and 6) are flagged as conflicts requiring user resolution, not silently auto-resolved
- [ ] `non_dotloop_generic_export.csv` falls through to generic fuzzy matching and achieves reasonable (not necessarily perfect) auto-mapping
- [ ] `bad_header_only.csv`, `bad_ragged_rows.csv`, and `bad_not_actually_csv.csv` all fail with clear, specific error messages — no unhandled exceptions, no silent partial imports
