export { default as mailRoutes } from './routes';
export { logFailedMailAttempt, sendLoggedMail } from './log-service';
export { MailSignatureProfileService } from './signature-profile-service';
export type { LoggedMailContext } from './log-service';
