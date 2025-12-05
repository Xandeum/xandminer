# xandminer Stats Toggle Patch

This patch adds a toggle switch to the xandminer GUI, allowing pNode operators to easily enable/disable stats reporting to XANDSCOPE.

## Overview

```
┌─────────────────────────────────────────────────────────┐
│  📊 XANDSCOPE Network Stats                             │
│                                                         │
│  Share your pNode stats with the network                │
│                                                         │
│  [━━━━━━━━━●] ON                                       │
│                                                         │
│  ✓ Your storage contributes to network totals          │
│  ✓ Visible on xandscope.io dashboard                   │
│  ✓ IP address is never shared (privacy protected)      │
│                                                         │
│  Last report: 2 min ago                                │
│                                                         │
│  View Network Dashboard →                               │
└─────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `src/components/StatsToggle.jsx` | React toggle component |
| `src/components/StatsToggle.css` | Styles for the toggle |

## Installation

### 1. Copy files to xandminer

```bash
# From xandminer repo root
cp path/to/patch/src/components/StatsToggle.jsx src/components/
cp path/to/patch/src/components/StatsToggle.css src/components/
```

### 2. Import and use the component

In your main dashboard component:

```jsx
import { StatsToggle } from './components/StatsToggle';
import './components/StatsToggle.css';

function Dashboard() {
  return (
    <div className="dashboard">
      {/* ... existing content ... */}
      
      {/* Add the stats toggle */}
      <StatsToggle />
      
      {/* ... more content ... */}
    </div>
  );
}
```

## Component Features

### States

| State | Display |
|-------|---------|
| Loading | Spinner while fetching status |
| Not Registered | Warning message, toggle disabled |
| Disabled | Toggle OFF, info about what enabling does |
| Enabled | Toggle ON, shows last report time |
| Error | Error message if xandminerd not reachable |

### API Calls

The component communicates with xandminerd:

| Action | Endpoint |
|--------|----------|
| Fetch status | `GET http://localhost:4000/stats/status` |
| Enable | `POST http://localhost:4000/stats/enable` |
| Disable | `POST http://localhost:4000/stats/disable` |

### Auto-refresh

Status is automatically refreshed every 30 seconds to keep the "Last report" time accurate.

## Customization

### Colors

Edit `StatsToggle.css` to match your theme:

```css
/* Primary accent color (toggle ON state) */
.stats-toggle-switch input:checked + .stats-toggle-slider {
  background: linear-gradient(135deg, #YOUR_COLOR 0%, #YOUR_COLOR 100%);
}

/* Card background */
.stats-toggle-card {
  background: linear-gradient(135deg, #YOUR_BG_1 0%, #YOUR_BG_2 100%);
}
```

### Position

Place the `<StatsToggle />` component wherever makes sense in your dashboard layout. Recommended locations:
- Settings page
- Sidebar
- Main dashboard (below pNode status)

## Requirements

- xandminerd must have the stats routes installed (see `xandminerd-patch/`)
- React 16.8+ (uses hooks)

## TypeScript Support

If using TypeScript, rename to `StatsToggle.tsx` and add types:

```tsx
interface StatsStatus {
  enabled: boolean;
  registered: boolean;
  publicKey: string | null;
  lastReport: string | null;
  lastStatus: string | null;
  endpoint: string;
}

// Component already typed implicitly via JSX
```

## License

Apache-2.0 (same as xandminer)

## Screenshots

### Disabled State
```
┌─────────────────────────────────────────────────────────┐
│  📊 XANDSCOPE Network Stats                             │
│  Share your pNode stats with the network                │
│                                                         │
│  [●━━━━━━━━━] OFF                                      │
│                                                         │
│  Enable to share your pNode's storage stats with the   │
│  Xandeum network. Your data helps show the network's   │
│  total storage capacity.                                │
│                                                         │
│  View Network Dashboard →                               │
└─────────────────────────────────────────────────────────┘
```

### Enabled State
```
┌─────────────────────────────────────────────────────────┐
│  📊 XANDSCOPE Network Stats                             │
│  Share your pNode stats with the network                │
│                                                         │
│  [━━━━━━━━━●] ON                                       │
│                                                         │
│  ✓ Your storage contributes to network totals          │
│  ✓ Visible on xandscope.io dashboard                   │
│  ✓ IP address is never shared (privacy protected)      │
│                                                         │
│  Last report: Just now                                  │
│                                                         │
│  View Network Dashboard →                               │
└─────────────────────────────────────────────────────────┘
```

### Not Registered State
```
┌─────────────────────────────────────────────────────────┐
│  📊 XANDSCOPE Network Stats                             │
│  Share your pNode stats with the network                │
│                                                         │
│  [●━━━━━━━━━] OFF  (disabled)                          │
│                                                         │
│  ⚠️ pNode must be registered before enabling stats     │
│     reporting                                           │
│                                                         │
│  View Network Dashboard →                               │
└─────────────────────────────────────────────────────────┘
```
