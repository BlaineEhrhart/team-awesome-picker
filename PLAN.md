# Team Awesome Picker — Implementation Plan

## Context
We're building a single static page app (vanilla HTML/CSS/JS) with two features:
1. **Spin the Wheel** — enter team member names, spin a colorful canvas wheel to randomly pick one
2. **Random Groups** — split the list of names into random groups of a chosen size

No build tools, no frameworks — just one `index.html` file that can be opened in a browser.

---

## Architecture

Single file: **`index.html`** containing inline `<style>` and `<script>` sections.

### Page Layout
- **Header** — app title
- **Name Input Section** — text input + "Add" button, list of added names with remove buttons
- **Tab/Toggle** — switch between "Spin Wheel" and "Random Groups" views
- **Spin Wheel View** — canvas-drawn pie wheel, "Spin" button, winner display
- **Random Groups View** — group size input, "Generate Groups" button, rendered group cards

### Key Components

#### 1. Name Management
- Text input to add names (support Enter key)
- Display names as removable chips/tags
- Store names in a JS array; persist to `localStorage` so they survive refresh

#### 2. Spinning Wheel (Canvas)
- Draw a pie chart on `<canvas>` with distinct colors per name segment
- Name labels drawn on each slice
- "Spin" button triggers a CSS/JS rotation animation (rotate the canvas via `requestAnimationFrame` with easing/deceleration)
- Fixed pointer/arrow at the top indicates the winner
- On stop, display the selected name prominently

#### 3. Random Group Generator
- Number input for desired group size (validated: min 1, max = team size)
- "Generate Groups" button shuffles the names (Fisher-Yates) and chunks into groups
- Render groups as styled cards with member names listed

---

## Implementation Steps

### Step 1 — Scaffold `index.html`
- HTML boilerplate with meta viewport for mobile
- Semantic structure: header, main sections, footer
- Inline CSS with clean modern styling (CSS custom properties for theming)

### Step 2 — Name Input & List
- Input field + Add button
- Render names as tag/chip elements with × remove buttons
- Wire up localStorage save/load

### Step 3 — Tab Switching
- Two-tab UI to toggle between Wheel and Groups views
- Simple show/hide with active tab styling

### Step 4 — Spinning Wheel
- `<canvas>` element sized responsively
- `drawWheel()` function: compute arc per name, fill with distinct colors, draw labels
- `spinWheel()`: animate rotation angle using `requestAnimationFrame` with exponential deceleration
- Pointer indicator (CSS triangle or drawn on canvas)
- Winner announcement on spin completion

### Step 5 — Random Groups
- Group size number input with validation
- Shuffle + chunk logic
- Render group cards in a CSS grid

### Step 6 — Polish
- Responsive design (works on mobile and desktop)
- Disabled states when no names are entered
- Smooth transitions and visual feedback

---

## Files Modified
- **`index.html`** — new file (the entire application)

## Verification
- Open `index.html` in a browser
- Add 5+ names → verify they appear as chips and persist on refresh
- Switch to Wheel tab → spin → verify animation and winner selection
- Switch to Groups tab → set group size → generate → verify groups are correct size and all names are included
- Remove a name → verify wheel and groups update accordingly
- Test on mobile viewport (responsive)
