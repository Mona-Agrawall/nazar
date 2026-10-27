import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, AuthError } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { setDemoMode } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await auth.signIn(email, password);
      } else {
        const { session } = await auth.signUp(email, password, displayName);
        // With email confirmation enabled Supabase returns no session; otherwise the user is already signed in.
        if (!session) setIsEmailSent(true);
      }
    } catch (err: any) {
      setError((err as AuthError).message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setIsEmailSent(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-ink)] flex flex-col items-center justify-center p-4 selection:bg-[var(--color-green-soft)] selection:text-[var(--color-green)]">
      {/* Premium subtle background glow */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-border-soft)] rounded-full blur-[120px] opacity-40 mix-blend-multiply" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <span className="font-mono text-xl font-medium text-[var(--color-ink)]">NAZAR</span>
          </div>
          <h1 className="text-3xl font-normal text-[var(--color-ink)] mb-2">
            {isLogin ? 'Welcome back.' : 'Join Nazar.'}
          </h1>
          <p className="text-[var(--color-muted)] text-sm">
            {isLogin
              ? 'Enter your credentials to access your market intelligence.'
              : 'Create your account to start tracking meaningful changes.'}
          </p>
        </div>

        <div className="bg-[var(--color-panel)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 shadow-sm">
          <AnimatePresence mode="wait">
            {isEmailSent ? (
              <motion.div
                key="email-sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-12 h-12 bg-[var(--color-green-soft)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-[var(--color-green)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-2">Check your email</h3>
                <p className="text-sm text-[var(--color-muted)] mb-6">
                  We sent a confirmation link to <strong className="font-medium">{email}</strong>. Please click the link
                  to activate your account.
                </p>
                <button
                  onClick={() => {
                    setIsEmailSent(false);
                    setIsLogin(true);
                  }}
                  className="text-sm text-[var(--color-ink)] hover:text-[var(--color-muted)] font-medium transition-colors"
                >
                  Return to sign in
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="auth-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-start gap-2 p-3 bg-[var(--color-red-soft)] border border-[var(--color-red)]/20 rounded-lg text-sm text-[var(--color-red)] mb-4">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>{error}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isLogin && (
                  <div>
                    <label className="block text-xs uppercase text-[var(--color-faint)] font-medium mb-1.5 ml-1">
                      Display Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-green)] focus:ring-1 focus:ring-[var(--color-green)] transition-all placeholder:text-[var(--color-border)]"
                        placeholder="How should we call you?"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs uppercase text-[var(--color-faint)] font-medium mb-1.5 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-faint)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-green)] focus:ring-1 focus:ring-[var(--color-green)] transition-all placeholder:text-[var(--color-border)]"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase text-[var(--color-faint)] font-medium mb-1.5 ml-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-faint)]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-green)] focus:ring-1 focus:ring-[var(--color-green)] transition-all placeholder:text-[var(--color-border)]"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--color-ink)] hover:bg-[var(--color-ink-soft)] text-white rounded-xl py-3 text-sm font-medium transition-colors mt-6 disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-[var(--color-muted)]">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={toggleMode}
              className="text-[var(--color-ink)] hover:text-[var(--color-green)] font-medium transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          <div className="mt-8 pt-6 border-t border-[var(--color-border-soft)]">
            <button
              onClick={() => setDemoMode(true)}
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors inline-flex items-center gap-2"
            >
              Skip for now <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
