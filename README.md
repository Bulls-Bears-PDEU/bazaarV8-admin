# Bazaar — Admin Panel

The organiser panel for **Bazaar**, the live stock market game run by the Bulls & Bears PDEU team. Organisers use it to approve players, run and steer the market, list stocks and IPOs, publish news that moves prices, and step into a player's account when something goes wrong.

Bazaar is split across three repositories:

| Repo | What it is | Dev port |
| --- | --- | --- |
| [bazaarV8-backend](https://github.com/Bulls-Bears-PDEU/bazaarV8-backend) | Express + Socket.IO API, price engine, trading engine, auth | `3000` |
| **bazaarV8-admin** (this repo) | Organiser panel | `5173` |
| [bazaarV8-frontend](https://github.com/Bulls-Bears-PDEU/bazaarV8-frontend) | Player app (screenshots of every page are in its README) | `5174` |

## What organisers can do

| Page | Route | Purpose |
| --- | --- | --- |
| Market | `/market` | Pause and resume trading, set market sentiment (bullish, bearish, neutral), and set trading rules: short selling, limit orders, short margin and maximum order size. The live market overview and Bazaar index live here too. |
| Stocks | `/stocks`, `/stock/$id` | List stocks, edit names, sectors, sector colours and logos, and inspect each stock's live chart and OHLC data. |
| Users | `/users` | Approve pending players, search and bulk-manage accounts, and open a player's detail sheet. **God mode** in that sheet adjusts cash, opens or closes positions, flattens a portfolio, cancels orders or resets an account. |
| Action log | `/actions` | Every change an organiser has made to a player's account, and who made it. |
| IPOs | `/ipos` | Draft, announce, open, close and list new stocks, review applications and run allotment. |
| News | `/news` | Write headlines, schedule or release them, and choose which stocks each story moves, by how much and over how long. |
| Leaderboard | `/leaderboard` | Every player ranked by net worth, refreshed every 10 seconds. |

Only users with the `admin` role get past sign-in; everyone else is sent to `/not_authorized`. All market and money figures come from the backend; the panel only displays them.

For how news impacts and sentiment move prices, see [stockEngine.md](https://github.com/Bulls-Bears-PDEU/bazaarV8-backend/blob/main/docs/stockEngine.md) in the backend repo.

## Tech stack

- [React 19](https://react.dev) and [Vite](https://vite.dev)
- [TanStack Router](https://tanstack.com/router) (file-based routes), [TanStack Query](https://tanstack.com/query), [TanStack Form](https://tanstack.com/form), [TanStack Table](https://tanstack.com/table) and [TanStack Virtual](https://tanstack.com/virtual)
- [Tailwind CSS v4](https://tailwindcss.com) with [shadcn/ui](https://ui.shadcn.com) components
- [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/) for price and index charts
- [Better Auth](https://www.better-auth.com) client for sessions, [Socket.IO](https://socket.io) client for live data
- [Biome](https://biomejs.dev) for linting and formatting, [Vitest](https://vitest.dev) for tests

## Getting started

### Prerequisites

- Node.js 22 or newer
- [pnpm](https://pnpm.io)
- The [backend](https://github.com/Bulls-Bears-PDEU/bazaarV8-backend) running on `http://localhost:3000`

### Run it

```bash
pnpm install
cp .env.example .env   # then set VITE_BACKEND_URL if the backend is not on localhost:3000
pnpm dev
```

The panel opens on <http://localhost:5173>. Keep this port: the backend only accepts requests and sockets from the admin panel (`5173`) and the player app (`5174`). If you change it, add the new origin to `FRONTEND_ORIGINS` in the backend's `.env`.

### Making yourself an admin

1. Sign up at `/auth/signup` and verify your email.
2. From the backend repo, promote the account:

   ```bash
   pnpm set-role you@example.com admin
   ```

3. Sign in again. You land on `/market`.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_BACKEND_URL` | `http://localhost:3000` | Base URL of the backend API and Socket.IO server |

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server on port 5173 |
| `pnpm build` | Build for production into `dist/` |
| `pnpm preview` | Serve the production build locally |
| `pnpm test` | Run the Vitest suite |
| `pnpm lint` / `pnpm format` / `pnpm check` | Biome lint, format, or both |

## Project structure

```text
src/
├── routes/            File-based routes (TanStack Router)
│   ├── auth/          Sign in, sign up, reset password
│   ├── _admin.tsx     Admin layout: session and role guard, sidebar shell
│   ├── _admin/        market, stocks, stock/$id, users, actions, ipos,
│   │                  news, leaderboard, about
│   ├── not_authorized.tsx
│   └── index.tsx      Landing page; signed-in admins go to /market
├── api/               One module per backend area (market, stocks, users, god-mode, …)
├── components/        Panel components; users/ holds the user sheet and god mode,
│                      ui/ holds the shadcn primitives
├── hooks/             Session, socket and small utilities
├── lib/               Auth client, formatting, chart colours, media helpers
└── types/             Shared TypeScript types for API responses
```

`src/routeTree.gen.ts` is generated by the router plugin. Don't edit it by hand.

## Conventions

- **The backend computes; the panel displays.** Don't add market or money calculations here. If a screen needs a new number, add it to a backend endpoint.
- **Use shadcn primitives.** Reach for a component in `src/components/ui/` before building a styled `div`. Add new ones with `pnpm dlx shadcn@latest add <component>`.
- **Keep shared files identical with the player app.** Files that exist in both apps, such as `styles.css`, the `ui/` components, `chart-colors.ts` and the chart components, should match `bazaarV8-frontend` exactly. When you change one, copy it to the other repo.
- Biome uses tabs and double quotes. Run `pnpm check` before committing.

## License

[GPL-3.0](LICENSE)
