import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, ArrowLeft, Mail, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
});

const signUpSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
  teamName: z.string().min(2, { message: "Team name must be at least 2 characters" }).max(50),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, createTeam, team } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // If user has a team, go to admin. Otherwise they'll be prompted to create one.
      navigate('/admin');
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Signed in successfully!');
      navigate('/admin');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = signUpSchema.safeParse({ email, password, teamName });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    // Step 1: Create auth account
    const { error: signUpError } = await signUp(email, password);
    if (signUpError) {
      setIsSubmitting(false);
      if (signUpError.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(signUpError.message);
      }
      return;
    }

    // Step 2: Sign in immediately (email confirmation disabled)
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setIsSubmitting(false);
      toast.error('Account created! Please sign in.');
      return;
    }

    // Step 3: Wait for Supabase session to be fully set
    // auth.uid() needs to be available before create_team_for_user runs
    let retries = 0;
    let sessionReady = false;
    while (retries < 10) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) { sessionReady = true; break; }
      await new Promise(res => setTimeout(res, 300));
      retries++;
    }

    if (!sessionReady) {
      setIsSubmitting(false);
      toast.error('Session timeout. Please sign in manually.');
      return;
    }

    // Step 4: Create team
    const { error: teamError } = await createTeam(teamName);
    setIsSubmitting(false);

    // Any error that is NOT about duplicate team is a real error
    if (teamError) {
      const msg = teamError.message ?? '';
      const isDuplicate = msg.includes('already owns') || msg.includes('duplicate') || msg.includes('23505');
      if (!isDuplicate) {
        toast.error('Team setup failed: ' + msg);
        return;
      }
    }

    // Success or duplicate (team already created) — navigate to admin
    toast.success(`Welcome! Your team is ready 🏏`);
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rankings
        </Button>

        <Card variant="elevated">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-3xl">🏏</span>
            </div>
            <CardTitle className="font-display text-2xl">StellarSlayers</CardTitle>
            <CardDescription>
              Sign in or create your team to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin" className="font-semibold">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="font-semibold">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Team
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-team">Team Name</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-team"
                        type="text"
                        placeholder="e.g. Karachi Kings"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Setting up your team...' : 'Create My Team 🏏'}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    You'll be the admin of your own team. Your data is private to your team.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
