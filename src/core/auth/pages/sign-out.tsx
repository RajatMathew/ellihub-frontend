import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { signOut } from '@app/api';

const SignOutPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [dots, setDots] = useState('');
  const navigate = useNavigate();

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    return () => clearInterval(interval);
  }, []);

  // Sign out
  useEffect(() => {
    signOut()
      .then(() => {
        setTimeout(() => {
          navigate('/sign-in', {
            replace: true,
            state: { message: 'You have been signed out successfully.' },
          });
        }, 3000); // slight delay for better UX
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to sign out. Please try again.');
      });
  }, [navigate]);

  if (error) {
    return <div className="py-6 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="py-10 flex flex-col items-center justify-center">
      <div className="flex justify-between items-baseline">
        <h1 className="text-lg font-medium">Signing out</h1>
        <div className="min-w-3.5">{dots}</div>
      </div>

      <p className="text-sm text-muted-foreground mt-2">
        Please wait while we securely log you out.
      </p>
    </div>
  );
};

export default SignOutPage;
