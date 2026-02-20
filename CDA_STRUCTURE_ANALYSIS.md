# CDA Structure Analysis

Based on the sample "Commission Disbursement Request & Authorization" PDF.

## Page 1: Commission Disbursement REQUEST

### Header Section
- **Type Selection**: Checkbox for "Selling Side Commission" OR "Listing Side Commission"
- **Property Address**: 862 W Neck Rd, Nobleboro, ME 04555
- **MLS#**: 1630233

### Transaction Details
**Left Column (Buyer Info):**
- Buyer Name
- Buyer Address
- Buyer Phone
- Buyer E-mail
- Loan Type

**Right Column (Seller Info):**
- Seller Name: Kevin Bacon
- Seller Address
- Seller Phone
- Seller E-mail: kevin.bacon513@gmail.com
- Closing Date

**Purchase Price & Commission:**
- Purchase Price: (blank)
- Total Gross Commission: 4.5% | $50,000
- Selling Gross Commission: __% | $.00
- Listing Gross Commission: __% | $.00

### Referral Company Section
- Referral %
- Referral Total $: .00
- Type of Referral: Checkbox for "Listing" or "Selling Side"
- Referral Contact
- Referral E-mail
- Referral Phone

### Dual Company Structure

**SELLING COMPANY**
- Split %: .00% to (company name)
- Address

**TOTAL COMMISSION (Selling)**
- $ .00 Commission before fees
- $ .00 Other +/-
- $ .00 Other +/-
- $ .00 Other +/-
- $ .00 Commission after fees

**SELLING AGENT(S) COMMISSION**
- % to AGENT 1: (name)
  - $ Other +/-
  - $ Other +/-
  - $ Other +/-
  - $ .00 TOTAL COMMISSION

- % to AGENT 2: (name)
  - $ Other +/-
  - $ Other +/-
  - $ Other +/-
  - $ .00 TOTAL COMMISSION

**BROKERAGE COMMISSION (Selling)**
- 100% to BROKER: (name)
  - $ Other +/-
  - $ Other +/-
  - $ Other +/-
  - $ .00 TOTAL DUE BROKERAGE

**LISTING COMPANY**
- Split %: .00% to (company name)
- Address: 700 Pete Rose Way, Cincinnati, OH 45203

**TOTAL COMMISSION (Listing)**
- $ .00 Commission before fees
- $ .00 Other +/-
- $ .00 Other +/-
- $ .00 Other +/-
- $ .00 Commission after fees

**LISTING AGENT(S) COMMISSION**
- % to AGENT 1: Drew Bryant
  - $ Other +/-
  - $ Other +/-
  - $ Other +/-
  - $ .00 TOTAL COMMISSION

- % to AGENT 2: (name)
  - $ Other +/-
  - $ Other +/-
  - $ Other +/-
  - $ .00 TOTAL COMMISSION

**BROKERAGE COMMISSION (Listing)**
- 100% to BROKER: (name)
  - $ Other +/-
  - $ Other +/-
  - $ Other +/-
  - $ .00 TOTAL DUE BROKERAGE

### Footer
- Commission Disbursement Requested by: (name)
- Additional Notes: (text area)

---

## Page 2: Commission Disbursement AUTHORIZATION

### Header Section
- **Property Address**: 862 W Neck Rd, Nobleboro, ME 04555
- **MLS#**: 1630233

### Transaction Summary
- **Buyer**: (name)
- **Title Company**: (name)
- **Closing Officer**: (name)
- **Seller**: Kevin Bacon
- **Acceptance Date**: (date)
- **Closing Date**: (date)
- **Sale Price**: $.00
- **Gross Commission**: $50,000.00 | 4.50%

### Referral Company
- **Brokerage**: (name)
- **Contact**: (name)
- **Address**: (address)

### Commission Disbursement

**SELLING COMMISSION**
- $ .00 to BROKERAGE
- $ .00 to REFERRAL COMPANY
- $ .00 to SELLING AGENT 1
- $ .00 to SELLING AGENT 2

**LISTING COMMISSION**
- $ .00 to BROKERAGE
- $ .00 to REFERRAL COMPANY
- $ .00 to LISTING AGENT 1
- $ .00 to LISTING AGENT 2

### Authorization
- **Authorized by**: Admin/Broker Signature (large signature box)
- **Admin/Broker Name**: (text field)

---

## Calculation Logic (Inferred)

### Flow:
1. **Gross Commission** = Sale Price × Commission Rate
2. **Split Between Sides**: 
   - Selling Gross Commission = Gross Commission × Selling Split %
   - Listing Gross Commission = Gross Commission × Listing Split %
3. **Referral Deduction** (if applicable):
   - Referral Total $ = (Selling or Listing Commission) × Referral %
4. **Company Split**:
   - Company Portion = Side Commission × Company Split %
   - Agent Portion = Side Commission × (100% - Company Split %)
5. **Other Adjustments** (+/- fees, transaction costs)
6. **Final Totals**:
   - Agent 1 Total Commission
   - Agent 2 Total Commission (if applicable)
   - Brokerage Total Commission

### Validation Rules:
- **Sum of all disbursements MUST equal Gross Commission**
- **Agent % + Broker % = 100%** (for each side)
- **Selling Commission + Listing Commission = Gross Commission**

---

## Fields Required from CSV/Database

### Transaction Data
- Property Address
- MLS Number
- Sale Price
- Closing Date
- Buyer Name, Address, Phone, Email
- Seller Name, Address, Phone, Email
- Loan Type

### Commission Data
- Total Commission Rate (%)
- Selling Side Split (%)
- Listing Side Split (%)
- Referral Company Name
- Referral Rate (%)
- Referral Type (Listing or Selling)

### Company Data
- Selling Company Name
- Selling Company Address
- Selling Company Split (%)
- Listing Company Name
- Listing Company Address
- Listing Company Split (%)

### Agent Data
- Selling Agent 1 Name
- Selling Agent 1 Split (%)
- Selling Agent 2 Name (optional)
- Selling Agent 2 Split (%)
- Listing Agent 1 Name
- Listing Agent 1 Split (%)
- Listing Agent 2 Name (optional)
- Listing Agent 2 Split (%)

### Brokerage Data
- Broker Name
- Broker Split (%)

### Additional Data
- Transaction Fees (Other +/-)
- Title Company Name
- Closing Officer Name
- Acceptance Date
- Requested By (name)
- Additional Notes

---

## PDF Generation Requirements

### Page 1: REQUEST
- Blue header bar with "COMMISSION DISBURSEMENT REQUEST"
- Checkbox selection for Selling/Listing Side
- Two-column layout for buyer/seller info
- Dual-column structure for Selling Company (left) and Listing Company (right)
- Clean form fields with underlines
- Section headers in blue uppercase
- "Other +/-" rows for adjustments
- Footer with requested by and notes

### Page 2: AUTHORIZATION
- Blue header bar with "COMMISSION DISBURSEMENT AUTHORIZATION"
- Transaction summary section
- Referral company section (right side)
- Commission disbursement breakdown (two columns)
- Large signature box for Admin/Broker
- Admin/Broker name field below signature

### Styling
- **Header Color**: Blue (#4A90E2 or similar)
- **Font**: Clean sans-serif (Arial, Helvetica)
- **Text Color**: Dark gray/black for body, blue for section headers
- **Layout**: Two-column responsive design
- **Borders**: Subtle lines for form fields
- **Spacing**: Generous padding between sections
