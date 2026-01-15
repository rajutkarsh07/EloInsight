import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const handleCallback = () => {
            const lichess = searchParams.get('lichess');
            const google = searchParams.get('google');
            const error = searchParams.get('error');
            const accessToken = searchParams.get('accessToken');
            const refreshToken = searchParams.get('refreshToken');
            const username = searchParams.get('username');
            const isNewUser = searchParams.get('isNewUser') === 'true';

            if (error) {
                setStatus('error');
                setMessage(error);
                toast.error(`❌ ${error}`);
                setTimeout(() => navigate('/login'), 3000);
                return;
            }

            // Handle both Lichess and Google OAuth callbacks
            if ((lichess === 'success' || google === 'success') && accessToken && refreshToken) {
                // Store tokens
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);

                const provider = lichess === 'success' ? 'Lichess' : 'Google';
                setStatus('success');
                setMessage(isNewUser 
                    ? `Welcome, ${username}! Your account has been created via ${provider}.`
                    : `Welcome back, ${username}!`
                );

                toast.success(isNewUser 
                    ? `🎉 Account created! Welcome, ${username}!`
                    : `✅ Logged in as ${username}`
                );

                // Redirect to dashboard after short delay
                setTimeout(() => {
                    window.location.href = '/dashboard'; // Full reload to update auth state
                }, 1500);
            } else {
                setStatus('error');
                setMessage('Invalid callback parameters');
                setTimeout(() => navigate('/login'), 3000);
            }
        };

        handleCallback();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 bg-grid relative overflow-hidden">
            <div className="absolute inset-0 gradient-overlay pointer-events-none" />
            
            <div className="w-full max-w-md bg-card/80 backdrop-blur-sm border rounded-2xl shadow-elevated p-8 relative z-10 animate-fade-in-up text-center">
                {status === 'processing' && (
                    <>
                        <Loader2 className="mx-auto h-16 w-16 text-primary animate-spin mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Processing...</h2>
                        <p className="text-muted-foreground">
                            Please wait while we complete your sign in.
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Success!</h2>
                        <p className="text-muted-foreground mb-4">{message}</p>
                        <p className="text-sm text-muted-foreground">
                            Redirecting to dashboard...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <AlertCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Error</h2>
                        <p className="text-muted-foreground mb-4">{message}</p>
                        <p className="text-sm text-muted-foreground">
                            Redirecting to login...
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthCallback;

