import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Users, BarChart3, Settings, Medal, GitCompare, Calendar, LayoutDashboard, Shield, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTeamSettings } from '@/hooks/useTeamSettings';
import { useAuth } from '@/hooks/useAuth';

const navItems = [{
  path: '/leaderboard',
  label: 'Leaderboard',
  icon: Medal
}, {
  path: '/compare',
  label: 'Compare',
  icon: GitCompare
}, {
  path: '/players',
  label: 'Players',
  icon: Users
}, {
  path: '/dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard
}, {
  path: '/matches',
  label: 'Matches',
  icon: Calendar
}, {
  path: '/team',
  label: 'Team',
  icon: Shield
}];

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { teamSettings } = useTeamSettings();
  const { isAdmin } = useAuth();

  const teamName = teamSettings?.team_name || 'Stellar Slayers';

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50">
      <div className="container">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-4 md:py-6">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              whileHover={{ rotate: 10, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-3xl md:text-4xl"
            >
              {teamSettings?.team_logo_url ? (
                <img
                  src={teamSettings.team_logo_url}
                  alt={`${teamName} logo`}
                  className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover border border-border"
                  loading="lazy"
                />
              ) : (
                <span aria-hidden>🏏</span>
              )}
            </motion.div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-wider uppercase text-foreground font-display group-hover:text-primary transition-colors">
                {teamName}
              </h1>
              <span className="hidden md:block text-xs text-muted-foreground tracking-widest uppercase">
                Cricket Rankings
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin" className="hidden md:block">
                <Button variant="outline" size="sm" className="gap-2 border-primary/30 hover:border-primary hover:bg-primary/10">
                  <Settings className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-1 pb-2 overflow-x-auto scrollbar-hide">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={item.path}>
                  <Button 
                    variant="ghost"
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-glow' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden pb-4 border-t border-border/50"
          >
            <div className="grid grid-cols-2 gap-2 pt-4">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button 
                      variant="ghost"
                      className={`w-full justify-start rounded-lg px-4 py-3 text-sm font-medium ${
                        isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start rounded-lg px-4 py-3 text-sm font-medium col-span-2"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </div>
    </header>
  );
}