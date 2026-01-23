import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Users, BarChart3, Settings, Medal, GitCompare, Calendar, LayoutDashboard, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
const navItems = [{
  path: '/',
  label: 'Rankings',
  icon: Trophy
}, {
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
  return <header className="sticky top-0 z-50 gradient-header shadow-lg">
      <div className="container">
        {/* Top Bar */}
        <div className="flex items-center justify-center py-6 border-b border-white/10 relative">
          <Link to="/" className="flex items-center gap-4">
            <motion.div initial={{
            rotate: -10,
            scale: 0.9
          }} animate={{
            rotate: 0,
            scale: 1
          }} transition={{
            type: "spring",
            stiffness: 200
          }} className="text-4xl">
              🏏
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-wider uppercase text-black font-serif">
              Stellar Slayers
            </h1>
          </Link>
          
          <Link to="/admin" className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block">
            <Button variant="glass" size="sm">
              <Settings className="w-4 h-4" />
              Admin
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex gap-0 overflow-x-auto scrollbar-hide">
          {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return <Link key={item.path} to={item.path}>
                <Button variant={isActive ? "navActive" : "nav"} className="rounded-none px-6 md:px-8 py-5 text-base">
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>;
        })}
        </nav>
      </div>
    </header>;
}