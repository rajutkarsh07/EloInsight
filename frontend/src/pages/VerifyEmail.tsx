import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Box,
    Paper,
    Typography,
    CircularProgress,
    Button,
    Alert,
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
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
        <Container maxWidth="sm">
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Paper elevation={3} sx={{ p: 4, width: '100%', textAlign: 'center' }}>
                    {status === 'loading' && (
                        <>
                            <CircularProgress size={64} sx={{ mb: 3 }} />
                            <Typography variant="h5" gutterBottom>
                                Verifying Your Email
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Please wait...
                            </Typography>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                            <Typography variant="h5" gutterBottom>
                                Email Verified!
                            </Typography>
                            <Typography variant="body1" color="text.secondary" paragraph>
                                {message}
                            </Typography>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => navigate('/login')}
                                sx={{ mt: 2 }}
                            >
                                Go to Login
                            </Button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
                            <Typography variant="h5" gutterBottom>
                                Verification Failed
                            </Typography>
                            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                                {message}
                            </Alert>
                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => navigate('/login')}
                                >
                                    Go to Login
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={() => navigate('/signup')}
                                >
                                    Sign Up Again
                                </Button>
                            </Box>
                        </>
                    )}
                </Paper>
            </Box>
        </Container>
    );
};

export default VerifyEmail;
