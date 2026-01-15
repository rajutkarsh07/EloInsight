import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { AlertCircle, Mail, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

const Login = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [lichessLoading, setLichessLoading] = useState(false);
    const [showEmailLogin, setShowEmailLogin] = useState(false);

    // Check for error from OAuth callback
    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam) {
            setError(errorParam);
            toast.error(`❌ ${errorParam}`);
        }
    }, [searchParams]);

    const handleSubmit = async () => {
        setError('');
        setLoading(true);
        try {
            await login({ email, password });
            toast.success('✅ Logged in successfully!');
            navigate('/dashboard', { replace: true });
        } catch (err: unknown) {
            let msg = 'Invalid credentials';
            if (err instanceof Error) {
                msg = err.message || msg;
            }
            toast.error(`❌ ${msg}`);
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleLichessLogin = () => {
        setLichessLoading(true);
        setError('');
        // Redirect to Lichess OAuth
        window.location.href = `${API_URL}/auth/lichess/login`;
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 bg-grid relative overflow-hidden">
            <div className="absolute inset-0 gradient-overlay pointer-events-none" />

            <div className="w-full max-w-md bg-card/80 backdrop-blur-sm border rounded-2xl shadow-elevated p-8 relative z-10 animate-fade-in-up">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">
                        ♟️ EloInsight
                    </h1>
                    <p className="text-muted-foreground">
                        Sign in to analyze your chess games
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Social Login Buttons */}
                <div className="space-y-3">
                    {/* Lichess Login - Primary */}
                    <button
                        type="button"
                        onClick={handleLichessLogin}
                        disabled={lichessLoading}
                        className={cn(
                            "w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                            "bg-zinc-800 text-white hover:bg-zinc-700 h-11 px-4 py-2 border border-zinc-600"
                        )}
                    >
                        {lichessLoading ? (
                            <span className="flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Connecting...
                            </span>
                        ) : (
                            <span className="flex items-center gap-3">
                                <img 
                                    src="https://lichess1.org/assets/logo/lichess-favicon-32.png" 
                                    alt="Lichess" 
                                    className="w-5 h-5"
                                />
                                Continue with Lichess
                                <ExternalLink size={14} className="ml-auto opacity-50" />
                            </span>
                        )}
                    </button>

                    {/* Google Login - Coming Soon */}
                    <button
                        type="button"
                        disabled
                        className={cn(
                            "w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all",
                            "bg-white text-gray-700 h-11 px-4 py-2 border border-gray-300 opacity-50 cursor-not-allowed"
                        )}
                    >
                        <span className="flex items-center gap-3 w-full">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Continue with Google
                            <span className="ml-auto text-xs bg-gray-200 px-2 py-0.5 rounded">Soon</span>
                        </span>
                    </button>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-zinc-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                </div>

                {/* Email Login Toggle */}
                <button
                    type="button"
                    onClick={() => setShowEmailLogin(!showEmailLogin)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                    <Mail size={16} />
                    Continue with Email
                    {showEmailLogin ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {/* Email Login Form */}
                {showEmailLogin && (
                    <form onSubmit={(e) => e.preventDefault()} className="space-y-4 mt-4 animate-fade-in-up">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
                                Email
                            </label>
                            <input
                                id="email"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                                Password
                            </label>
                            <input
                                id="password"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleSubmit}
                            className={cn(
                                "w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                "bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 btn-glow"
                            )}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Signing in...
                                </div>
                            ) : 'Sign In'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center text-sm">
                    <span className="text-muted-foreground">Don't have an account? </span>
                    <Link to="/signup" className="font-medium text-primary hover:underline underline-offset-4 link-hover">
                        Sign up
                    </Link>
                </div>

                {/* Info box */}
                <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-muted-foreground">
                    <p className="font-semibold mb-1 text-blue-400">🔒 Secure OAuth Login</p>
                    <p>Sign in with Lichess to automatically verify your account and import your games. Your Lichess password is never shared with us.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
