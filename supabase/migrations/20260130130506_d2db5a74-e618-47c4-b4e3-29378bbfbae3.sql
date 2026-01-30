-- Add write protection for admin_audit_log
-- Only the security definer function insert_admin_audit_log can insert

-- Deny INSERT for non-admin roles (the function uses SECURITY DEFINER so it bypasses RLS)
CREATE POLICY "Only admins can insert audit logs via function"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Deny UPDATE - no one should update audit logs
CREATE POLICY "No one can update audit logs"
ON public.admin_audit_log
FOR UPDATE
USING (false);

-- Deny DELETE - no one should delete audit logs
CREATE POLICY "No one can delete audit logs"
ON public.admin_audit_log
FOR DELETE
USING (false);