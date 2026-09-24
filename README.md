# Ashutosh Pathak — interactive portfolio

A small explorable 3D world (Next.js + React Three Fiber) introducing Ashutosh Pathak, pharma & healthcare digital marketer.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static export to out/
npm run test:e2e  # build + end-to-end tests in headless Chrome (desktop, iPhone, fallbacks)
```

The e2e suite (`scripts/e2e.mjs`) drives the real game: walking, collisions, zones, tour, coins,
scooter stars, mobile joystick/layout, reduced motion, no-WebGL and no-JS fallbacks. It uses the
installed Google Chrome and loads the page with `?debug`, which exposes read-only state on `window.__game`.

Hosted on Vercel (project `ashutoshpathak`, connected to this repo): every push to `main` deploys to production, other branches get preview URLs.

Content (bio, case studies, links) lives in `components/content.ts`.
