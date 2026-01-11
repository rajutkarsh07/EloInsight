import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, RotateCw } from 'lucide-react';
import { apiClient } from '../services/apiClient';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link. No token provided.');
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await apiClient.get<{ message: string; verified: boolean }>(
                    `/auth/verify-email?token=${token}`
                );
                setStatus('success');
                setMessage(response.message);
            } catch (err: unknown) {
                setStatus('error');
                if (err instanceof Error) {
                    setMessage(err.message || 'Verification failed. The link may have expired.');
                } else {
                    setMessage('Verification failed. The link may have expired.');
                }
            }
        };

        verifyEmail();
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border rounded-2xl shadow-elevated p-8 text-center animate-fade-in-up">
                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <RotateCw className="h-16 w-16 text-primary animate-spin mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Verifying Your Email</h2>
                        <p className="text-muted-foreground">Please wait...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
                        <p className="text-muted-foreground mb-6">{message}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 rounded-md font-medium transition-colors btn-glow"
                        >
                            Go to Login
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg w-full mb-6 text-sm">
                            {message}
                        </div>
                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => navigate('/login')}
                                className="flex-1 border border-input bg-background hover:bg-accent text-foreground py-2 rounded-md font-medium transition-colors"
                            >
                                Go to Login
                            </button>
                            <button
                                onClick={() => navigate('/signup')}
                                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 py-2 rounded-md font-medium transition-colors"
                            >
                                Sign Up Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
