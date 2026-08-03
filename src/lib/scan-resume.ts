/**
 * sessionStorage key used to remember that a "Scan receipt" attempt was in progress when the
 * user was sent through Google's full-page OAuth redirect — the app's first use of
 * sessionStorage (see ScanReceiptSheet's 'gate' step). Set only right before that redirect;
 * cleared by every sign-in flow (the gate's own redirect and AccountSheet's, alike) so an
 * abandoned attempt can never resurrect a scan sheet the user didn't ask to reopen.
 */
export const RESUME_SCAN_KEY = 'checkplease:resume-scan'
