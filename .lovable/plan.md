

# Fix 5 Stale-Data useEffect Hooks

## Problem

Five components use `useEffect(() => { ... }, [])` to fetch org-scoped data on mount only. If the user switches organisation or re-authenticates, the data goes stale.

## Approach

Import `useOrg` in each component and add `membership?.orgId` to the dependency array so data re-fetches when the active org changes.

---

## Changes

### 1. `src/pages/SiteAccess.tsx` (line 57-59)
- Import `useOrg` hook
- Add `const { membership } = useOrg()` 
- Change `useEffect(() => { fetchData(); }, [])` to `useEffect(() => { fetchData(); }, [membership?.orgId])`

### 2. `src/pages/Inductions.tsx` (line 88-90)
- Same pattern: import `useOrg`, add `membership?.orgId` to the dependency array

### 3. `src/pages/Reports.tsx` (line 113-115)
- Same pattern: import `useOrg`, add `membership?.orgId` to the dependency array

### 4. `src/components/dashboard/ComplianceCalendarWidget.tsx` (line 39-65)
- Same pattern: import `useOrg`, add `membership?.orgId` to the dependency array

### 5. `src/components/rams/steps/Step1ProjectDetails.tsx` (line 62-75)
- Import `useOrg` hook
- Add `membership?.orgId` to the dependency array
- Also add `formData.ramsReference` to the dependency array (it's already checked inside, but listing it satisfies the exhaustive-deps rule and prevents the linter warning)

---

## Technical Notes

| File | Current Deps | New Deps |
|------|-------------|----------|
| SiteAccess.tsx | `[]` | `[membership?.orgId]` |
| Inductions.tsx | `[]` | `[membership?.orgId]` |
| Reports.tsx | `[]` | `[membership?.orgId]` |
| ComplianceCalendarWidget.tsx | `[]` | `[membership?.orgId]` |
| Step1ProjectDetails.tsx | `[]` | `[formData.ramsReference, membership?.orgId]` |

All five files follow the same minimal change: add the `useOrg` import and inject the org ID dependency. No structural refactoring needed.

