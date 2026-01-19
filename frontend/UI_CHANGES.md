# UI Overhaul Analysis

Based on the provided mockups, here is the breakdown of necessary modifications to align the codebase with the new design system.

## 1. Design System Updates
**Target**: Global (Tailwind config)
- **Colors**: Update primary to `#269c92`, add new palette (surface-dark `#22252a`, etc).
- **Fonts**: Adopt `Plus Jakarta Sans` as the primary display font.
- **Dark Mode**: The designs heavily rely on a `dark` mode class strategy.

## 2. Page: Barcode Scanner (`ScanPage.tsx`)
**Current**: Simple white card with camera viewport and manual input below.
**Target**: Immersive "Camera-first" Dark UI.
- **Viewport**: Full-screen video feed.
- **Overlay**: 
  - Custom Header (Flashlight, Manual Entry toggle, Close).
  - Central Reticle with "Scanning Active" animation.
  - "Point at barcode" instruction pill.
- **New Feature**: "Last Scanned" Drawer at the bottom (showing recent scans history).
- **Manual Entry**: Moved to a modal/overlay instead of being always visible below.

## 3. Page: Add Item Details (`AddItemPage.tsx` or Modal)
**Current**: Inline form in ScanPage.
**Target**: Dedicated "Add Item Details" view.
- **Layout**: Clean card layout with progress bar.
- **Inputs**:
  - **Name**: Large, editable text.
  - **Quantity**: Stepper component (+ / - buttons).
  - **Unit**: Dropdown selector.
  - **Expiration**: Date picker + "Quick Add Chips" (+3 Days, +1 Week, +1 Month).
  - **Storage**: Visual Radio Cards (Fridge, Freezer, Pantry) with icons.
- **Actions**: "Scan Another" (secondary) and "Add to Pantry" (primary).

## 4. Page: Dashboard & Pantry (`Dashboard.tsx`, `PantryPage.tsx`)
**Current**: Basic lists.
**Target**: Rich Dashboard.
- **Fridge Watch**: Visual alerts for expiring items.
- **Suggested Recipes**: Cards with "Match %" based on inventory.
- **Inventory List**: Items with status badges (Good, Low Stock, Expired) and visual indicators.

## 5. New Components Required
To support this, we need to build:
- `StockStatusBadge` (Good, Low, Expired).
- `StorageSelector` (Visual cards).
- `QuickDateChips`.
- `ScannerOverlay` (Reticle, Header).
- `ScannedItemsDrawer`.

## Implementation Priority
1.  **Scanner & Add Item Flow** (Immediate focus).
2.  **Pantry Inventory List**.
3.  **Dashboard/Home**.
