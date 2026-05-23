import { getMicrosoftClientId } from './getMicrosoftClientId';
import { getMicrosoftRedirectUri } from './getMicrosoftRedirectUri';

export const getMicrosoftSignInUrl = () => {
  const oauthUrl =
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  const options = {
    client_id: getMicrosoftClientId(),
    response_type: 'code',
    redirect_uri: getMicrosoftRedirectUri(),
    response_mode: 'query',
    scope: 'openid profile email offline_access',
    prompt: 'select_account',
  };
  return `${oauthUrl}?${new URLSearchParams(options).toString()}`;
};
