import { getGoogleClientId } from './getGoogleClientId';
import { getGoogleRedirectUri } from './getGoogleRedirectUri';

export const getGoogleSignInUrl = () => {
  const oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: getGoogleRedirectUri(),
    client_id: getGoogleClientId(),
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' '),
  };
  return `${oauthUrl}?${new URLSearchParams(options).toString()}`;
};
