import { useState, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, BarChart3, Loader2, CheckCircle } from 'lucide-react';

export default function SignupPage() {
  const { signUp } = useAuth();
  const [, navigate] = useLocation();

  const [brokerageName, setBrokerageName] = useState('');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [confirm,       setConfirm]       = useState('');
  const [terms,         setTerms]         = useState(false);
  const [showPw,        setShowPw]        = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [done,          setDone]          = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!terms) {
      setError('Please accept the terms of service');
      return;
    }

    setLoading(true);
    const { error: authError } = await signUp(email, password, brokerageName);
    setLoading(false);

    if (authError) {
      console.error('[SignupPage] signUp error:', authError);
      // Show the full error message so we can debug
      const msg = authError.message || String(authError);
      setError(msg);
    } else {
      setDone(true);
    }
  }

  // Success state — Supabase sends a confirmation email
  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground mb-6">
            We sent a confirmation link to <span className="text-foreground font-medium">{email}</span>.
            Click the link to activate your account.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-3">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Dotloop Reporter</h1>
          <p className="text-sm text-muted-foreground mt-1">Set up your brokerage account</p>
        </div>

        {/* Card */}
        <div className="bg-secondary border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-5">Create your account</h2>

          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
            {/* Brokerage name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Brokerage name</label>
              <input
                type="text"
                value={brokerageName}
                onChange={e => setBrokerageName(e.target.value)}
                required
                placeholder="Acme Realty Group"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@brokerage.com"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 pr-10 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repeat password"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={terms}
                onChange={e => setTerms(e.target.checked)}
                className="mt-0.5 accent-emerald-500"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => navigate('/privacy-policy')}
                  className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </button>
              </span>
            </label>

            {/* Error */}
            {error && (
              <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
