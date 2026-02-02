

# Security Review Report

## Summary

This security review analyzed your cricket statistics application with a Lovable Cloud backend. The review identified **6 security issues**: 2 critical, 2 warnings, and 2 informational findings.

---

## Critical Issues (Immediate Action Required)

### 1. Admin Privilege Escalation via Self-Removal of Other Admins

**Severity**: CRITICAL  
**Location**: `src/pages/Admin.tsx` (lines 150-161)

**Problem**: The admin page contains code that automatically deletes all admin roles EXCEPT the currently signed-in user's role. This means any admin who logs in will remove all other admins from the system.

```text
Code Flow:
  Admin User A logs in
        |
        v
  useEffect triggers
        |
        v
  DELETE FROM user_roles WHERE role='admin' AND user_id != A
        |
        v
  All other admins lose access!
```

**Impact**: 
- Any malicious or confused admin can lock out all other administrators
- Could be exploited by the first person to discover this behavior
- Creates a single point of failure for admin access

**Remediation**: Remove this dangerous code block entirely. Admin management should be done through explicit actions, not automatic deletion.

---

### 2. Security Definer View Detected

**Severity**: CRITICAL  
**Location**: Database views (`player_stats`, `team_settings_public`)

**Problem**: The `player_stats` view is defined with `SECURITY DEFINER`, meaning it executes with the permissions of the view creator (typically a superuser) rather than the querying user. This bypasses Row Level Security policies.

**Impact**: Could allow unauthorized data access if the view is modified or if RLS policies are added to underlying tables.

**Remediation**: Recreate the view as `SECURITY INVOKER` (the default) to ensure RLS policies are properly enforced:

```sql
-- Drop and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS player_stats;
CREATE VIEW player_stats AS ... -- same definition
-- SECURITY INVOKER is the default, so no need to specify
```

---

## Warning Issues (Should Address Soon)

### 3. Leaked Password Protection Disabled

**Severity**: WARNING  
**Location**: Authentication settings

**Problem**: The password leak detection feature (HaveIBeenPwned integration) is currently disabled. This means users can register with passwords that have been exposed in known data breaches.

**Impact**: Accounts could be created with compromised passwords, making them vulnerable to credential stuffing attacks.

**Remediation**: Enable leaked password protection in your backend authentication settings. This can be done through the Cloud dashboard.

---

### 4. Player Statistics View Has No RLS Policies

**Severity**: WARNING  
**Location**: `player_stats` view

**Problem**: The `player_stats` view has no RLS policies defined. While it's a view (so it inherits from underlying tables), having explicit policies ensures consistent access control.

**Impact**: Currently relies on underlying table RLS, which is working correctly, but adds complexity to security auditing.

**Remediation**: Since this is a publicly-readable statistics view, consider adding an explicit public read policy or documenting that it intentionally inherits from underlying tables.

---

## Informational Findings

### 5. Team Settings Public View Configuration

**Severity**: INFO  
**Location**: `team_settings_public` view, `useTeamSettings.ts`

**Status**: PROPERLY SECURED

The application correctly uses a public view (`team_settings_public`) that excludes the `admin_owner_user_id` field, preventing exposure of admin user IDs. The `useTeamSettings` hook queries this secure view instead of the main table.

---

### 6. Match Templates Hidden from Public

**Severity**: INFO  
**Location**: `match_templates` table RLS policies

**Status**: CORRECTLY CONFIGURED

Match templates are admin-only, which is appropriate for internal team management data.

---

## Security Posture Summary

| Area | Status |
|------|--------|
| Authentication Implementation | Good - Uses Supabase Auth correctly |
| Role-Based Access Control | Good - Uses separate `user_roles` table |
| RLS Policies | Mostly Good - 30 policies covering most tables |
| Edge Function Security | Good - Validates admin role server-side |
| Storage Policies | Good - Admin-only uploads, public reads |
| Input Validation | Good - Uses Zod schemas |
| Session Management | Good - Uses proper auth state listeners |

---

## Recommended Fixes

### Immediate Priority

1. **Remove the admin self-removal code** from `src/pages/Admin.tsx` (lines 150-161)
2. **Enable leaked password protection** via Cloud dashboard

### Short-Term

3. **Recreate the `player_stats` view** without SECURITY DEFINER
4. **Add explicit RLS policy** for `team_settings_public` view

---

## Technical Implementation Details

### Fix 1: Remove Dangerous Admin Code

Remove lines 150-161 from `src/pages/Admin.tsx`:

```typescript
// DELETE THIS ENTIRE BLOCK:
useEffect(() => {
  if (loading || !user || !isAdmin) return;
  supabase
    .from('user_roles')
    .delete()
    .eq('role', 'admin')
    .neq('user_id', user.id)
    .then(() => {
      // No-op; if there are no other admins, nothing happens.
    });
}, [loading, user, isAdmin]);
```

### Fix 2: Database Migration for View Security

```sql
-- Fix player_stats view to use SECURITY INVOKER
DROP VIEW IF EXISTS public.player_stats;
CREATE VIEW public.player_stats AS
  SELECT p.id AS player_id,
    count(DISTINCT b.match_id) AS matches,
    -- ... rest of view definition
  FROM players p
    LEFT JOIN batting_inputs b ON p.id = b.player_id
    LEFT JOIN bowling_inputs bo ON p.id = bo.player_id
    LEFT JOIN fielding_inputs f ON p.id = f.player_id
  GROUP BY p.id;

-- Add explicit RLS policy for the view
CREATE POLICY "Public read access for player_stats"
  ON player_stats FOR SELECT TO public USING (true);
```

### Fix 3: Enable Leaked Password Protection

Navigate to Cloud Dashboard > Authentication Settings and enable "Leaked Password Protection".

