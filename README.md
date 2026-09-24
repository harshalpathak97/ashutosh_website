# Ashutosh Pathak — interactive portfolio

A small explorable 3D world (Next.js + React Three Fiber) introducing Ashutosh Pathak, pharma & healthcare digital marketer.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static export to out/
```

Pushing to `main` builds and deploys `out/` to Hostinger (`.github/workflows/deploy.yml`, needs the `SSH_PRIVATE_KEY` secret).

Content (bio, case studies, links) lives in `components/content.ts`.
