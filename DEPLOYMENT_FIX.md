# Deployment Build Fix

## Issue
The deployment build is failing with:
1. `Module not found: Can't resolve '@/components/image-crop-modal'`
2. `Export ADMIN_EMAIL doesn't exist in target module`

## Root Cause
The deployment process shows: "Frontend is not a git repository - rebuilding from existing files"

This means the deployment is **not pulling from git** and is using outdated files.

## Solution

### Files That Must Be Present

1. **`components/image-crop-modal.tsx`**
   - Location: `Frontend/components/image-crop-modal.tsx`
   - Status: ✅ Committed in v0.2 and v0.3
   - Export: `export function ImageCropModal`

2. **`lib/config.ts`**
   - Location: `Frontend/lib/config.ts`
   - Status: ✅ Committed in v0.3
   - Export: `export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@promora.ai';`

### Verification Commands

```bash
# Verify files exist
ls -la components/image-crop-modal.tsx
ls -la lib/config.ts

# Verify exports
grep "export function ImageCropModal" components/image-crop-modal.tsx
grep "export const ADMIN_EMAIL" lib/config.ts
```

### Deployment Requirements

The deployment process must:
1. **Pull from git repository** OR
2. **Ensure all files from v0.3 are present** including:
   - `components/image-crop-modal.tsx`
   - `lib/config.ts` (with ADMIN_EMAIL export)

### Dockerfile Verification

The Dockerfile correctly uses `COPY . .` which should include all files. The issue is that the source directory doesn't have the latest files.

### Fix Steps

1. **If deployment uses git:**
   ```bash
   git pull origin main
   git checkout v0.3  # or latest tag
   ```

2. **If deployment uses file copy:**
   - Ensure `components/image-crop-modal.tsx` is copied
   - Ensure `lib/config.ts` is copied (with ADMIN_EMAIL export)

3. **Verify before build:**
   ```bash
   test -f components/image-crop-modal.tsx && echo "✅ image-crop-modal.tsx exists" || echo "❌ MISSING"
   grep -q "export const ADMIN_EMAIL" lib/config.ts && echo "✅ ADMIN_EMAIL exported" || echo "❌ MISSING"
   ```

## Current Status

- ✅ Files are committed in git repository
- ✅ Files are in v0.3 tag
- ✅ Dockerfile is correct
- ❌ Deployment is not pulling from git

## Next Steps

1. Configure deployment to pull from git repository
2. OR manually ensure these files are in the deployment directory:
   - `components/image-crop-modal.tsx`
   - `lib/config.ts`

