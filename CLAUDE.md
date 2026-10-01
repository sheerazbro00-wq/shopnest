# CLAUDE.md — ShopNest (MERN E-Commerce)

This file documents the stack, structure, and conventions for this project.
Read before touching any code. Project conventions here win over generic defaults.

---

## Stack

- **Client:** React 18 + Vite, plain JavaScript (no TypeScript), React Router,
  Axios for API calls, React Context for cart/auth state.
- **Server:** Node.js + Express, MongoDB via Mongoose.
- **Auth:** JWT (jsonwebtoken) + bcryptjs for password hashing.
- **Payments:** Stripe (test mode for now). Can be swapped/extended for
  JazzCash/EasyPaisa later for the Pakistan market.
- **Store type:** General multi-category store (not a single niche).
- **Package manager:** npm.

---

## Folder Structure

```
ShopNest/
  client/                 Vite React app
    src/
      components/         Reusable UI (Navbar, Footer, ProductCard, etc.)
      pages/               Route-level views (Home, Shop, ProductDetail, Cart, Checkout, Login, Register)
      context/             CartContext, AuthContext
      api/                 Axios instance + API call functions
      assets/
  server/                 Express API
    config/                DB connection, env setup
    models/                Mongoose schemas (Product, User, Order)
    routes/                Express routers
    controllers/           Route handler logic
    middleware/            auth (JWT verify), error handling
    server.js               Entry point
  CLAUDE.md
```

Client and server are two separate npm projects (separate `package.json`,
`node_modules`). Run them independently in dev.

---

## Running the Project

- Client dev server: `cd client && npm run dev`
- Server dev (with nodemon): `cd server && npm run dev`
- Server needs a `.env` file (never commit it) with:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `STRIPE_SECRET_KEY`
  - `PORT`

---

## Core Principles

1. **Inspect before you change.** Don't assume — check existing files/patterns
   in this repo before adding new ones.
2. **Smallest clean change.** Solve the actual problem, minimum sensible edit.
   No over-engineering, no speculative abstractions.
3. **Match existing patterns.** Follow the folder layout and naming already
   established above, even for new features.
4. **The user is learning.** Briefly explain the *why* behind non-obvious
   decisions — practical, not academic. Reply in Roman Urdu when the user
   writes in Roman Urdu.

---

## Code Quality

- Clean, readable, no dead code, no leftover debug logs, no commented-out blocks.
- Meaningful names; small, focused components/functions.
- No copy-paste duplication — extract shared logic only when it's genuinely reused.
- Comment only the *why* (non-obvious constraints/workarounds), not the *what*.

---

## React (Client) Conventions

- Functional components + hooks only.
- Cart state lives in `CartContext`; auth state in `AuthContext`. Don't
  duplicate this state locally in components — consume the context.
- Keep API calls out of components where possible — put them in `src/api/`
  and call from components/pages.
- Minimise state; derive values (totals, counts) rather than storing them
  redundantly.
- Responsive by default: mobile, tablet, desktop. No fixed-width layouts that
  break on small screens.

---

## Express (Server) Conventions

- Routes stay thin — business logic goes in controllers.
- Validate and sanitize all request input server-side. Never trust client data.
- Auth-protected routes use the `middleware/auth.js` JWT check.
- Passwords are always hashed with bcryptjs — never store plaintext.
- Return consistent JSON error shapes: `{ message: "..." }` with proper HTTP
  status codes.

---

## Security

- Never commit `.env`, API keys, or secrets. `.gitignore` must cover
  `node_modules`, `.env`, build output.
- Stripe secret key stays server-side only; only the publishable key goes to
  the client.
- Sanitize all user input; escape output; use Mongoose schema validation.

---

## Git & File Safety

- Keep commits focused and scoped to one task.
- Never run destructive git operations (`reset --hard`, force push, branch
  deletion) without explicit permission.
- Only commit/push when asked.

---

## Working Principle

- Do not over-engineer or add features/pages that weren't asked for.
- Existing conventions in this file and in the codebase take priority over
  generic "best practices" that conflict with them.
- Make the minimum necessary change to achieve the requested result.
