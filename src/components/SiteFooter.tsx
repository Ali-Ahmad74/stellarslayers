import { useTeamSettings } from "@/hooks/useTeamSettings";

export function SiteFooter() {
  const { teamSettings } = useTeamSettings();

  const teamName = teamSettings?.team_name || "Cricket Club";
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 py-8 mt-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {teamSettings?.team_logo_url ? (
              <img
                src={teamSettings.team_logo_url}
                alt={`${teamName} logo`}
                className="h-9 w-9 rounded-full object-cover border border-border"
                loading="lazy"
              />
            ) : (
              <span className="text-2xl">🏏</span>
            )}
            <div>
              <p className="font-display text-foreground font-semibold tracking-wide">
                {teamName}
              </p>
              <p className="text-xs text-muted-foreground">Cricket Rankings System</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            © {year} {teamName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
