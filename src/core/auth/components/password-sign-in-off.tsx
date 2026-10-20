import { Link } from 'react-router-dom';

/**
 * Shown on the forgot- and reset-password pages while password sign-in is
 * switched off: their endpoints answer 404, and a link is the way in.
 */
export function PasswordSignInOff() {
  return (
    <div className="block w-full space-y-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Passwords are turned off</h1>
      <p className="text-sm text-muted-foreground">
        ElliHub sign-in uses an emailed link instead. Request one from the sign-in page.
      </p>
      <Link to="/sign-in" className="text-sm font-semibold text-foreground hover:text-primary">
        Go to sign in
      </Link>
    </div>
  );
}
