import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { authService } from '../services/authService';
import { cn } from '../lib/utils';

interface LinkedAccounts {
    chessCom: string;
    lichess: string;
}

const Settings = () => {
    const [accounts, setAccounts] = useState<LinkedAccounts>({
        chessCom: '',
        lichess: '',
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const user = await authService.getCurrentUser();
                setAccounts({
                    chessCom: user.chessComUsername || '',
                    lichess: user.lichessUsername || '',
                });
            } catch (err) {
                console.error('Failed to load profile', err);
            }
        };
        fetchProfile();
    }, []);

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
                lichessUsername: accounts.lichess,
            });

            setSuccess('Settings saved successfully');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save settings');
        } finally {
            setLoading(false);
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

            <div className="max-w-md">
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

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none" htmlFor="chessCom">
                                Chess.com Username
                            </label>
                            <input
                                id="chessCom"
                                name="chessCom"
                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="e.g. magnuscarlsen"
                                value={accounts.chessCom}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none" htmlFor="lichess">
                                Lichess Username
                            </label>
                            <input
                                id="lichess"
                                name="lichess"
                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="e.g. DrNykterstein"
                                value={accounts.lichess}
                                onChange={handleChange}
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
            </div>
        </div>
    );
};

export default Settings;
