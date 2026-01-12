import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { AlertCircle } from 'lucide-react'; import { toast } from 'sonner';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError('');
        setLoading(true);
        console.log(email, password);
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

                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
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
                            autoFocus
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
                            "bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 mt-6 btn-glow"
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

                <div className="mt-6 text-center text-sm">
                    <span className="text-muted-foreground">Don't have an account? </span>
                    <Link to="/signup" className="font-medium text-primary hover:underline underline-offset-4 link-hover">
                        Sign up
                    </Link>
                </div>

                <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border/50 text-xs text-muted-foreground">
                    <p className="font-semibold mb-1">Test Credentials:</p>
                    <p>Email: demo@eloinsight.dev</p>
                    <p>Password: password123</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
