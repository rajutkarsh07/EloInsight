import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, AlertCircle, Mail, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { authService } from '../services/authService';
import { cn } from '../lib/utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

const Signup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [lichessLoading, setLichessLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showEmailSignup, setShowEmailSignup] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const validateForm = (): boolean => {
        if (!formData.email || !formData.username || !formData.password) {
            setError('All fields are required');
            return false;
        }
        if (formData.username.length < 3) {
            setError('Username must be at least 3 characters');
            return false;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            setError('Username can only contain letters, numbers, and underscores');
            return false;
        }
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return false;
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            setError('Password must contain at least 1 uppercase, 1 lowercase, and 1 number');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!validateForm()) return;
        setLoading(true);

        try {
            await authService.register({
                email: formData.email,
                username: formData.username,
                password: formData.password,
            });
            setSuccess(true);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message || 'Registration failed. Please try again.');
            } else {
                setError('Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLichessSignup = () => {
        setLichessLoading(true);
        // Redirect to Lichess OAuth - same endpoint handles both login and signup
        window.location.href = `${API_URL}/auth/lichess/login`;
    };

    const handleGoogleSignup = () => {
        setGoogleLoading(true);
        // Redirect to Google OAuth - same endpoint handles both login and signup
        window.location.href = `${API_URL}/auth/google/login`;
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-card border rounded-2xl shadow-elevated p-8 text-center animate-fade-in-up">
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
                    <p className="text-muted-foreground mb-4">
                        We've sent a verification link to <strong>{formData.email}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                        Click the link in the email to verify your account. The link will expire in 24 hours.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 rounded-md font-medium transition-colors btn-glow"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 bg-grid relative overflow-hidden">
            <div className="absolute inset-0 gradient-overlay pointer-events-none" />

            <div className="w-full max-w-md bg-card/80 backdrop-blur-sm border rounded-2xl shadow-elevated p-8 relative z-10 animate-fade-in-up">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">
                        ♟️ EloInsight
                    </h1>
                    <p className="text-muted-foreground">
                        Create your account to start analyzing
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Social Signup Buttons */}
                <div className="space-y-3">
                    {/* Lichess Signup - Primary */}
                    <button
                        type="button"
                        onClick={handleLichessSignup}
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
                                Sign up with Lichess
                                <ExternalLink size={14} className="ml-auto opacity-50" />
                            </span>
                        )}
                    </button>

                    {/* Google Signup */}
                    <button
                        type="button"
                        onClick={handleGoogleSignup}
                        disabled={googleLoading}
                        className={cn(
                            "w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                            "bg-white text-gray-700 hover:bg-gray-50 h-11 px-4 py-2 border border-gray-300"
                        )}
                    >
                        {googleLoading ? (
                            <span className="flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                                Connecting...
                            </span>
                        ) : (
                            <span className="flex items-center gap-3 w-full">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Sign up with Google
                            </span>
                        )}
                    </button>
                </div>

                {/* Benefits of Lichess signup */}
                <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <p className="text-xs text-green-400 font-medium mb-1">✨ Recommended: Sign up with Lichess</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                        <li>• Instantly verify your chess account</li>
                        <li>• Auto-import your Lichess games</li>
                        <li>• No password to remember</li>
                    </ul>
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

                {/* Email Signup Toggle */}
                <button
                    type="button"
                    onClick={() => setShowEmailSignup(!showEmailSignup)}
                    className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                    <Mail size={16} />
                    Sign up with Email
                    {showEmailSignup ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {/* Email Signup Form */}
                {showEmailSignup && (
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4 animate-fade-in-up">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none" htmlFor="email">Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none" htmlFor="username">Username</label>
                            <input
                                id="username"
                                name="username"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                            <p className="text-xs text-muted-foreground">Letters, numbers, and underscores only</p>
                        </div>

                        <div className="space-y-2 relative">
                            <label className="text-sm font-medium leading-none" htmlFor="password">Password</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">Min 8 chars, 1 uppercase, 1 lowercase, 1 number</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none" htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                "bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 btn-glow"
                            )}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center text-sm">
                    <span className="text-muted-foreground">Already have an account? </span>
                    <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4 link-hover">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
