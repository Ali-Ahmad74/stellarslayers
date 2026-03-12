/**
 * useTeamId — returns the current user's team ID.
 * All admin create/update operations must pass this team_id.
 */
import { useAuth } from '@/hooks/useAuth';

export function useTeamId(): string | null {
  const { team } = useAuth();
  return team?.id ?? null;
}
