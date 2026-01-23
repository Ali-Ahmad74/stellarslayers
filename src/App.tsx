import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import PlayerProfile from "./pages/PlayerProfile";
import Players from "./pages/Players";
import Stats from "./pages/Stats";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Leaderboard from "./pages/Leaderboard";
import Compare from "./pages/Compare";
import MatchHistory from "./pages/MatchHistory";
import Dashboard from "./pages/Dashboard";
import TeamProfile from "./pages/TeamProfile";
import NotFound from "./pages/NotFound";
import SeriesList from "./pages/SeriesList";
import SeriesDetail from "./pages/SeriesDetail";

const queryClient = new QueryClient();

// Cricket Ranking System App with Auth
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/player/:id" element={<PlayerProfile />} />
            <Route path="/players" element={<Players />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/series" element={<SeriesList />} />
            <Route path="/series/:id" element={<SeriesDetail />} />
            <Route path="/matches" element={<MatchHistory />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/team" element={<TeamProfile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
