import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, CheckCircle, AlertCircle, RefreshCw, ExternalLink, Shield, ShieldCheck, Unlink } from 'lucide-react';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';
import { cn } from '../lib/utils';

interface LinkedAccounts {
    chessCom: string;
    lichess: string;
    lichessVerified: boolean;
    chessComVerified: boolean;
}

const Settings = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [accounts, setAccounts] = useState<LinkedAccounts>({
        chessCom: '',
        lichess: '',
        lichessVerified: false,
        chessComVerified: false,
    });
    const [loading, setLoading] = useState(false);
    const [connectingLichess, setConnectingLichess] = useState(false);
    const [disconnectingLichess, setDisconnectingLichess] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const user = await authService.getCurrentUser();
                setAccounts({
                    chessCom: user.chessComUsername || '',
                    lichess: user.lichessUsername || '',
                    lichessVerified: user.lichessVerified || false,
                    chessComVerified: user.chessComVerified || false,
                });
            } catch (err) {
                console.error('Failed to load profile', err);
            }
        };
        fetchProfile();
    }, []);

    // Handle OAuth callback query params
    useEffect(() => {
        const lichessStatus = searchParams.get('lichess');
        const username = searchParams.get('username');
        const message = searchParams.get('message');

        if (lichessStatus === 'connected' && username) {
            setSuccess(`Lichess account "${username}" connected and verified!`);
            setAccounts(prev => ({
                ...prev,
                lichess: username,
                lichessVerified: true,
            }));
            // Clear query params
            setSearchParams({});
            // Refresh user data
            authService.getCurrentUser().then(user => {
                setAccounts({
                    chessCom: user.chessComUsername || '',
                    lichess: user.lichessUsername || '',
                    lichessVerified: user.lichessVerified || false,
                    chessComVerified: user.chessComVerified || false,
                });
            });
        } else if (lichessStatus === 'error') {
            setError(message || 'Failed to connect Lichess account');
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAccounts({ ...accounts, [e.target.name]: e.target.value });
        setSuccess('');
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess('');
        setError('');

        try {
            await authService.updateProfile({
                chessComUsername: accounts.chessCom,
                // Lichess can only be set via OAuth, not manually
            });

            setSuccess('Settings saved successfully');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const handleConnectLichess = async () => {
        setConnectingLichess(true);
        setError('');

        try {
            const response = await apiClient.get<{ url: string }>('/auth/lichess/url');
            // Redirect to Lichess OAuth
            window.location.href = response.url;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to initiate Lichess connection');
            setConnectingLichess(false);
        }
    };

    const handleDisconnectLichess = async () => {
        if (!confirm('Are you sure you want to disconnect your Lichess account?')) {
            return;
        }

        setDisconnectingLichess(true);
        setError('');

        try {
            await apiClient.post('/auth/lichess/disconnect');
            setAccounts(prev => ({
                ...prev,
                lichess: '',
                lichessVerified: false,
            }));
            setSuccess('Lichess account disconnected');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to disconnect Lichess account');
        } finally {
            setDisconnectingLichess(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your connected accounts and preferences.
                </p>
            </div>

            <div className="max-w-lg">
                <div className="bg-card border rounded-xl shadow-card p-6 animate-fade-in-up">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <RefreshCw size={20} />
                        Connected Accounts
                    </h2>

                    {success && (
                        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-center gap-2">
                            <CheckCircle size={16} />
                            {success}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Chess.com Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium leading-none flex items-center gap-2" htmlFor="chessCom">
                                    <img 
                                        src="https://www.chess.com/bundles/web/favicons/favicon-32x32.png" 
                                        alt="Chess.com" 
                                        className="w-5 h-5"
                                    />
                                    Chess.com Username
                                </label>
                                {accounts.chessComVerified && (
                                    <span className="flex items-center gap-1 text-xs text-green-500">
                                        <ShieldCheck size={14} />
                                        Verified
                                    </span>
                                )}
                            </div>
                            <input
                                id="chessCom"
                                name="chessCom"
                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="e.g. magnuscarlsen"
                                value={accounts.chessCom}
                                onChange={handleChange}
                            />
                            <p className="text-xs text-muted-foreground">
                                <CheckCircle size={12} className="inline mr-1 text-green-500" />
                                Chess.com uses a public API - just enter your username to sync games.
                            </p>
                        </div>

                        {/* Lichess Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium leading-none flex items-center gap-2" htmlFor="lichess">
                                    <img 
                                        src="https://lichess1.org/assets/logo/lichess-favicon-32.png" 
                                        alt="Lichess" 
                                        className="w-5 h-5"
                                    />
                                    Lichess Username
                                </label>
                                {accounts.lichessVerified && (
                                    <span className="flex items-center gap-1 text-xs text-green-500">
                                        <ShieldCheck size={14} />
                                        Verified
                                    </span>
                                )}
                            </div>
                            
                            {accounts.lichessVerified ? (
                                // Show verified account with disconnect option
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 flex h-10 items-center rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm">
                                        <span className="text-green-400 font-medium">{accounts.lichess}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDisconnectLichess}
                                        disabled={disconnectingLichess}
                                        className={cn(
                                            "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                            "border border-destructive/30 text-destructive hover:bg-destructive/10 h-10 px-3"
                                        )}
                                    >
                                        {disconnectingLichess ? (
                                            <RefreshCw className="animate-spin h-4 w-4" />
                                        ) : (
                                            <Unlink size={16} />
                                        )}
                                    </button>
                                </div>
                            ) : (
                                // Show connect button only (no manual input)
                                <button
                                    type="button"
                                    onClick={handleConnectLichess}
                                    disabled={connectingLichess}
                                    className={cn(
                                        "w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                        "bg-zinc-800 text-white hover:bg-zinc-700 h-10 px-4 py-2 border border-zinc-600"
                                    )}
                                >
                                    {connectingLichess ? (
                                        <span className="flex items-center gap-2">
                                            <RefreshCw className="animate-spin h-4 w-4" />
                                            Connecting...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <img 
                                                src="https://lichess1.org/assets/logo/lichess-favicon-32.png" 
                                                alt="Lichess" 
                                                className="w-4 h-4"
                                            />
                                            Connect with Lichess
                                            <ExternalLink size={14} />
                                        </span>
                                    )}
                                </button>
                            )}
                            
                            <p className="text-xs text-muted-foreground">
                                <ShieldCheck size={12} className="inline mr-1 text-green-500" />
                                Connect via OAuth to verify your Lichess account ownership.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                "bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 btn-glow"
                            )}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <RefreshCw className="animate-spin h-4 w-4" />
                                    Saving...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Save size={16} />
                                    Save Changes
                                </span>
                            )}
                        </button>
                    </form>
                </div>

                {/* Info Card */}
                <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                        <Shield size={16} />
                        Account Verification
                    </h3>
                    <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• <strong className="text-green-400">Chess.com</strong> - Uses public API, just enter your username to sync games</li>
                        <li>• <strong className="text-blue-400">Lichess</strong> - OAuth required to verify account ownership and sync games</li>
                        <li>• Verification proves you own the chess account you're analyzing</li>
                        <li>• Prevents others from claiming your verified accounts</li>
                        <li>• OAuth tokens are encrypted and securely stored</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Settings;
