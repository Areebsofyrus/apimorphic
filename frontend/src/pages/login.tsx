import { useState } from 'react';
import { login, register } from '../lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, Lock, Loader2, ArrowRight, HelpCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import RobonitoLogo from '@/components/robonito-logo';
import APIMorphicLogo from '@/components/apimorphic-logo';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
  isEmbed?: boolean;
}

export default function Login({ onLoginSuccess, isEmbed = false }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && !name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await register(email, password, name);
        toast.success('Account created successfully! Logging you in...');
        const authData = await login(email, password);
        onLoginSuccess(authData.token);
      } else {
        const authData = await login(email, password);
        toast.success('Logged in successfully!');
        onLoginSuccess(authData.token);
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (isEmbed) {
    return (
      <div className="w-full">
        <Card className="p-6 border-none bg-transparent shadow-none space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-base font-extrabold tracking-tight text-slate-850 dark:text-indigo-150">
              {isSignUp ? 'Create Studio Account' : 'Sign In to Studio'}
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {isSignUp ? 'Join to auto-generate test suites' : 'Access your workspaces and run tests'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 h-10 text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-10 text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-10 text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-1.5 shadow-sm rounded-xl cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="relative flex py-0.5 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-2 text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">Or</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <div className="text-center pb-1">
            <button
              type="button"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-850 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer transition-colors"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Already have an account? Sign In' : 'New to APIMorphic? Create Account'}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-200/40 dark:bg-indigo-900/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-200/40 dark:bg-violet-900/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md z-10"
      >
        <Card className="p-8 border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-xl space-y-6">
          <div className="text-center space-y-3">
            <div className="flex flex-col items-center select-none py-2 w-full">
              <div className="flex flex-col items-center relative">
                <APIMorphicLogo className="h-15 w-auto shrink-0 object-contain" />
                <div className="flex items-center gap-1.5 self-end translate-x-6 mt-1 mr-4">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    by
                  </span>
                  <RobonitoLogo className="h-5 w-auto text-indigo-650 dark:text-indigo-400" />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-2">
              Auto-generate test suites & isolate mock datasets using AI Models.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 h-10 text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-10 text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-10 text-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-1.5 shadow-sm rounded-xl cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Or</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <div className="text-center">
            <button
              type="button"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer transition-colors"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Already have an account? Sign In' : 'New to APIMorpic? Create Account'}
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
              <HelpCircle className="h-3 w-3 text-indigo-500" />
              <span>Why <strong>APIMorphic</strong>?</span>
            </div>
            <p className="text-[10px] text-muted-foreground/90 max-w-xs mx-auto mt-1 leading-relaxed">
              Derived from <strong>API</strong> + <strong>Morphic</strong> (shaping/varying form). Represents our AI engine's ability to morph static API specifications into dynamic execution scenarios, realistic payloads, and boundary edge cases.
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
