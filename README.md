# xandminer

> Xandeum pNode Dashboard - GUI for managing your Xandeum storage node

[![Version](https://img.shields.io/badge/version-v0.5.0-blue.svg)](https://github.com/Xandeum/xandminer)
[![Codename](https://img.shields.io/badge/codename-Ingolstadt-orange.svg)](https://github.com/Xandeum/xandminer)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Overview

xandminer is the web-based GUI dashboard for Xandeum pNode operators. It provides an intuitive interface for:

- **Storage Management** - View drives, dedicate storage to Xandeum
- **pNode Registration** - Register your pNode on the blockchain
- **Wallet Integration** - Connect Solana wallets to manage your node
- **System Monitoring** - View service status, network speed, versions
- **Software Updates** - Update pNode software with one click
- **Stats Reporting** - Share your pNode stats with the network (optional)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         pNode Server                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Browser ────▶ xandminer (Next.js) ────▶ xandminerd (Express)  │
│                    :3000                      :4000             │
│                      │                          │               │
│                      │                          │               │
│                      ▼                          ▼               │
│                ┌──────────┐              ┌──────────┐           │
│                │ systemctl│              │  Local   │           │
│                │ commands │              │  Disk    │           │
│                └──────────┘              └──────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Requirements

- **Node.js** >= 16.x
- **xandminerd** running on `localhost:4000`
- **Solana Wallet** extension (Phantom, Solflare, etc.)
- **Linux** with systemd (for service management)

## Installation

```bash
# Clone the repository
git clone https://github.com/Xandeum/xandminer.git
cd xandminer

# Install dependencies
npm install

# Development mode
npm run dev

# Production build
npm run build
npm start
```

The dashboard will be available at `http://127.0.0.1:3000`

## Configuration

Located in `src/CONSTS.ts`:

```typescript
export const API_BASE_URL = "http://localhost:4000";  // xandminerd API

export const XANDMint = new PublicKey("XANDuUoVoUqniKkpcKhrxmvYJybpJvUxJLr21Gaj3Hx");
export const DEVNET_PROGRAM = new PublicKey("6Bzz3KPvzQruqBg2vtsvkuitd6Qb4iCcr5DViifCwLsL");
export const PNODE_PROGRAM = new PublicKey("3hMZVwdgRHYSyqkdK3Y8MdZzNwLkjzXod1XrKcniXw56");

export const SYSTEM_RESERVE = 30_000_000_000;  // 30 GB reserved for system
export const VERSION_NO = "v0.5.0";
export const VERSION_NAME = "Ingolstadt";
```

## Features

### 1. Drive Management

View all available drives and their storage:
- Total capacity
- Used space  
- Available space
- Dedicated Xandeum storage

Dedicate storage using the slider or +/- buttons. Minimum 10 GB increments.

### 2. pNode Registration

Three-step process:

1. **Generate Identity Keypair** - Create Ed25519 keypair for your pNode
2. **Connect Wallet** - Connect Solana wallet with pNode credits
3. **Register pNode** - Submit registration transaction to DevNet

The GUI checks `purchased_pnodes` vs `registered_pnodes` from the Manager PDA before allowing registration.

### 3. Service Management

Monitor and control system services via systemctl:

| Service | Description |
|---------|-------------|
| xandminer | This GUI dashboard |
| xandminerd | Backend daemon |
| pod | Xandeum storage pod |

Start/stop services with one click (▶/■ icons).

### 4. Software Updates

Update all pNode software via the "Update pNode Software" button:
- Runs upgrade scripts via WebSocket
- Shows real-time progress
- Restarts services automatically

### 5. Network Speed Test

Test network performance:
- Download speed (Mbps)
- Upload speed (Mbps)
- Uses `speedtest-cli`

### 6. Stats Reporting (XANDSCOPE)

Optional toggle to share pNode stats with network dashboards:
- Storage capacity and usage
- Software versions
- Online status
- Privacy-protected (no IP addresses)

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 13.x | React framework with API routes |
| TypeScript | 5.x | Type safety |
| React | 18.x | UI library |
| Tailwind CSS | 3.x | Styling |
| Material UI | 5.x | Component library |
| DaisyUI | 1.x | UI components |
| Zustand | 3.x | State management |
| @solana/wallet-adapter | 0.15+ | Wallet integration |
| Socket.IO Client | 4.x | Real-time updates |
| Axios | 1.x | HTTP client |

## File Structure

```
xandminer/
├── src/
│   ├── pages/
│   │   ├── _app.tsx           # App wrapper with providers
│   │   ├── _document.tsx      # HTML document
│   │   ├── index.tsx          # Main page (renders HomeView)
│   │   └── api/
│   │       └── service.ts     # System service API (systemctl)
│   ├── views/
│   │   ├── index.tsx          # Views barrel export
│   │   ├── home/
│   │   │   └── index.tsx      # Main dashboard view
│   │   └── install-pod/
│   │       └── index.tsx      # Pod installation wizard
│   ├── components/
│   │   ├── AppBar.tsx         # Navigation bar
│   │   ├── ContentContainer.tsx # Layout container
│   │   ├── Footer.tsx         # Footer
│   │   ├── Loader.tsx         # Loading spinner
│   │   ├── Notification.tsx   # Toast notifications
│   │   ├── StatsToggle.jsx    # XANDSCOPE stats toggle
│   │   ├── StatsToggle.css    # Toggle styles
│   │   ├── nav-element/       # Navigation components
│   │   └── Text/              # Typography components
│   ├── services/
│   │   ├── driveServices.ts   # POST /drive/dedicate
│   │   ├── getDriveInfo.ts    # POST /drives
│   │   ├── keypairServices.ts # GET/POST /keypair
│   │   ├── pnodeServices.ts   # GET/POST /pnode
│   │   ├── getServerInfo.ts   # GET /server-ip, /versions
│   │   ├── getNetworkInfo.ts  # GET /network
│   │   └── systemServices.ts  # Local API /api/service
│   ├── stores/
│   │   ├── usePnodeStatsStore.tsx     # Connection state
│   │   ├── useNotificationStore.tsx   # Toast notifications
│   │   └── useUserSOLBalanceStore.tsx # SOL balance tracking
│   ├── contexts/
│   │   ├── ContextProvider.tsx       # Combined providers
│   │   ├── AutoConnectProvider.tsx   # Wallet auto-connect
│   │   ├── NetworkConfigurationProvider.tsx
│   │   └── UrlProvider.tsx           # URL/RPC provider
│   ├── helpers/
│   │   └── pNodeHelpers.ts    # getPnodeManagerAccountData()
│   ├── hooks/
│   │   └── useQueryContext.tsx # URL query params
│   ├── modals/
│   │   ├── featureInfoModal.tsx
│   │   └── urlUpdateModal.tsx
│   ├── models/
│   │   └── types.ts           # TypeScript types
│   ├── utils/
│   │   ├── explorer.ts        # Solana explorer links
│   │   ├── index.tsx          # Utility exports
│   │   └── notifications.tsx  # Notification helpers
│   ├── assets/                # Images and animations
│   ├── CONSTS.ts              # Constants & config
│   └── styles/
│       └── globals.css        # Global styles
├── public/
│   ├── xandeumlogo.png
│   └── favicon.ico
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## API Integration

### xandminerd API Calls (localhost:4000)

| Service Function | xandminerd Endpoint | Method |
|------------------|---------------------|--------|
| `getDriveInfo()` | `/drives` | POST |
| `dedicateSpace()` | `/drive/dedicate` | POST |
| `getKeypair()` | `/keypair` | GET |
| `createKeypair()` | `/keypair/generate` | POST |
| `getPnode()` | `/pnode` | GET |
| `createPnode()` | `/pnode` | POST |
| `getServerIP()` | `/server-ip` | GET |
| `getVersions()` | `/versions` | GET |
| `getNetworkInfo()` | `/network` | GET |

### Local Next.js API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/service` | GET | Get status of all services |
| `/api/service` | POST | Start/stop a service |

## Wallet Support

Supported Solana wallets via `@solana/wallet-adapter`:
- Phantom
- Solflare  
- Backpack
- Ledger
- Torus
- And more...

## Blockchain Integration

Connects to **Xandeum DevNet**:

```typescript
const connection = new Connection(
  "https://api.devnet.xandeum.com:8899",
  "confirmed"
);
```

### pNode Manager Account

Before registration, checks if wallet has purchased pNode credits:

```typescript
const pNodeManagerInfo = await getPnodeManagerAccountData(
  connection, 
  wallet.publicKey
);

// Returns:
// - purchased_pnodes: Number of pNodes bought
// - registered_pnodes: Number already registered
```

PDA derived with seeds: `["manager", ownerPublicKey]`

## Version History

| Version | Codename | Notes |
|---------|----------|-------|
| v0.5.0 | Ingolstadt | Current release, stats toggle |
| v0.4.x | Herrenberg | Previous release |
| v0.3.x | Munich | Legacy |

## Development

```bash
# Install dependencies
npm install

# Run development server (hot reload)
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### "XandMiner Daemon is offline"

xandminerd is not running. Start it:
```bash
cd /path/to/xandminerd
npm start
```

### "Cannot connect to wallet"

1. Install a Solana wallet extension (Phantom recommended)
2. Make sure browser allows the extension
3. Refresh the page and try again

### "Registration failed - need to purchase pNode(s) first"

1. Go to xandeum.network
2. Purchase pNode credits with your wallet
3. Wait ~1 hour for blockchain propagation
4. Try registration again

### "Service does not exist"

The systemd service files are not installed. Run the software update to install them.

## Security

- Dashboard runs on localhost only (`127.0.0.1:3000`)
- No external network access by default
- Wallet signatures required for blockchain operations
- Private keys never leave your wallet
- Service control requires local access

## Related Projects

- [xandminerd](https://github.com/Xandeum/xandminerd) - pNode daemon (required)
- [Xandeum](https://xandeum.network) - Main network website
- [Xandeum Docs](https://docs.xandeum.network) - Documentation

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Xandeum Labs** - Building the future of decentralized storage
