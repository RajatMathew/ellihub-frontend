export { api, default, debugForceUpdate } from './client';
export { getCurrentAccess, type CurrentAccess } from './access';
export {
  authClient,
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  requestPasswordReset,
  resetPassword,
  changePassword,
} from './auth-client';
