# CivicTrust Client - Deployment Guide

## SPA Fallback Configuration for React Router

This is a **Single Page Application (SPA)** built with React Router. When deploying, you MUST configure your hosting platform to fallback all client-side routes to `index.html` so React Router can handle navigation.

### Direct Route Problem

Without proper SPA fallback, accessing routes directly will result in "Not Found" errors:
- `/qr-report/Z-101` → 404 Not Found
- `/copilot` → 404 Not Found
- `/track-ticket` → 404 Not Found
- Page refresh on any client-side route → 404 Not Found
- QR scans from mobile → 404 Not Found

### Deployment to Render

**Important:** Use the following settings when deploying to Render.com:

1. **Basic Settings**
   - Name: `civictrust-client` (or your project name)
   - Environment: `Static Site`

2. **Build Configuration**
   - Root Directory: `client`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

3. **Rewrites Configuration** (CRITICAL)
   - Navigate to your Render project dashboard
   - Go to "Redirects/Rewrites" settings
   - Add the following rewrite rule:
     - **Source**: `/*`
     - **Destination**: `/index.html`
     - **Action**: Rewrite
   - This ensures all routes fallback to index.html

4. **Alternative (Netlify Configuration)**
   - If deploying to Netlify instead, the `netlify.toml` should have:
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

### Deployment to Vercel

The `vercel.json` file in this directory contains Vercel-specific configuration:
- Automatically rewrites all routes to `/index.html`
- No additional setup needed beyond standard deployment

### Deployment to Static Hosting (with _redirects support)

Platforms that support Netlify-style `_redirects` file (Render, Netlify, etc.):
- The `_redirects` file in `public/` directory is copied to `dist/` during build
- Contains: `/*    /index.html   200`
- This tells the server to rewrite all routes to index.html with 200 status

### Build and Test

**Local Testing:**
```bash
cd client
npm install
npm run build
npm run preview
```

Then test these routes in the preview:
- `http://localhost:4173/qr-report/Z-101`
- `http://localhost:4173/copilot`
- `http://localhost:4173/track-ticket`
- `http://localhost:4173/demo-mode`

Refreshing these routes should NOT show "Not Found".

### QR Code Generation

QR codes are generated with the frontend origin:
```javascript
const qrUrl = typeof window !== 'undefined' 
  ? `${window.location.origin}/qr-report/${zone.zoneId}`
  : 'https://civictrust-app.onrender.com/qr-report/{zone.zoneId}';
```

This ensures:
- QR links work when scanned from mobile
- Links are always to the correct deployment domain
- No hardcoded localhost references

### Troubleshooting

**Issue: Still getting 404 on direct routes**
- ✅ Verify `_redirects` file exists in `dist/` after build
- ✅ Check Render/Netlify dashboard for rewrite rules
- ✅ Clear browser cache
- ✅ Check `vercel.json` if using Vercel

**Issue: QR codes not scanning**
- ✅ Ensure QR link uses `window.location.origin`
- ✅ Test QR with full URL: `https://your-domain.onrender.com/qr-report/Z-101`
- ✅ Verify deployment domain is public and accessible

**Issue: Routes work in dev but not in production**
- ✅ SPA fallback is likely not configured
- ✅ Review "Deployment to Render" section above
- ✅ Check deployment logs for build errors

### Files for SPA Deployment

- `public/_redirects` - Netlify/Render style rewrite rules
- `vercel.json` - Vercel rewrite rules
- `vite.config.js` - Base Vite configuration (no special SPA config needed)

All these files work together to ensure your React Router SPA works correctly across all major hosting platforms.
