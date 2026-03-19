# Modal Conversion Project - Full-Screen Modals with Close Button

## Overview
Convert all modals, popups, and submenus in the Dotloop Reporter to full-screen with close button (X) in top-right corner. Users should return to analyzed data when closing, not route to homepage.

## Modals to Convert

### High Priority (Currently Broken or Visible)
- [ ] Commission Breakdown Modal (AgentCommissionBreakdown)
  - Currently: Side panel (Sheet)
  - Target: Full-screen with X button
  - File: client/src/components/AgentLeaderboardWithExport.tsx

- [ ] Agent Details Modal (AgentDetailsPanel)
  - Currently: Side panel (Sheet)
  - Target: Full-screen with X button
  - File: client/src/components/AgentLeaderboardWithExport.tsx

### Medium Priority (Drill-Down Views)
- [ ] Drill-Down Modal (DrillDownModal)
  - Currently: Unknown state
  - Target: Full-screen with X button
  - File: client/src/components/DrillDownModal.tsx

- [ ] Transaction Details Modal
  - Currently: Unknown state
  - Target: Full-screen with X button

### Lower Priority (Submenus/Dialogs)
- [ ] Field Mapper Dialog
  - Currently: Dialog component
  - Target: Full-screen with X button
  - File: client/src/components/FieldMapper.tsx

- [ ] Column Mapping Dialog
  - Currently: Dialog component
  - Target: Full-screen with X button
  - File: client/src/components/ColumnMapping.tsx

- [ ] Commission Plan Assignment Modal
  - Currently: Unknown state
  - Target: Full-screen with X button

- [ ] CDA Builder Modal
  - Currently: Unknown state
  - Target: Full-screen with X button

- [ ] Upload History Modal
  - Currently: Unknown state
  - Target: Full-screen with X button

- [ ] Alert/Confirmation Dialogs
  - Currently: AlertDialog components
  - Target: Full-screen with X button (if applicable)

## Implementation Steps

### Step 1: Audit All Modals
- [ ] Search for all Dialog, Sheet, AlertDialog, and Modal components
- [ ] Document current implementation and location
- [ ] Identify which ones need conversion

### Step 2: Create Full-Screen Modal Template
- [ ] Create reusable FullScreenModal component
- [ ] Include:
  - Full-screen overlay
  - Close button (X) in top-right corner
  - Header with title
  - Content area
  - Proper z-index management
  - Smooth open/close animations

### Step 3: Convert Each Modal
For each modal, convert from current implementation to full-screen:
- [ ] Commission Breakdown
- [ ] Agent Details
- [ ] Drill-Down Views
- [ ] Field Mapper
- [ ] Column Mapping
- [ ] Commission Plan Assignment
- [ ] CDA Builder
- [ ] Upload History
- [ ] Other dialogs

### Step 4: Test All Modals
- [ ] Test opening each modal
- [ ] Test close button (X) functionality
- [ ] Verify return to analyzed data (not homepage)
- [ ] Test keyboard shortcuts (ESC to close)
- [ ] Test overlay click to close (if applicable)
- [ ] Verify z-index and stacking order
- [ ] Test on different screen sizes

### Step 5: Verify Data Persistence
- [ ] Confirm analyzed data remains visible after closing modal
- [ ] Verify no data loss when opening/closing modals
- [ ] Test with different data sets

## Files to Modify

### Main Components
- client/src/components/AgentLeaderboardWithExport.tsx
- client/src/components/DrillDownModal.tsx
- client/src/components/FieldMapper.tsx
- client/src/components/ColumnMapping.tsx
- client/src/components/AgentCommissionBreakdown.tsx
- client/src/components/AgentDetailsPanel.tsx

### Potentially Affected
- client/src/pages/Home.tsx
- client/src/components/CommissionPlansManager.tsx
- client/src/components/TeamManager.tsx
- client/src/components/AgentAssignment.tsx

## Notes
- All modals should have consistent styling and behavior
- Close button should always be in top-right corner
- Modals should not route to homepage on close
- Consider adding keyboard shortcuts (ESC to close)
- Consider adding overlay click to close (optional)

## Completion Criteria
✅ All modals are full-screen
✅ All modals have X close button in top-right
✅ Closing modal returns to analyzed data
✅ No data loss when opening/closing modals
✅ All tests pass
✅ Consistent styling across all modals
