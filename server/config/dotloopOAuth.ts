/**
 * ⚠️  DOTLOOP OAUTH NOTE — DO NOT ADD A `scope` PARAMETER
 *
 * Dotloop's /oauth/authorize endpoint does NOT accept a `scope` query parameter.
 * Adding one causes Dotloop to reject the request with `invalid_scope`.
 *
 * Scopes are assigned at app registration time in the Dotloop developer portal
 * and returned in the access token response.
 *
 * Valid authorize URL params per Dotloop's public API docs:
 *   response_type, client_id, redirect_uri, state, redirect_on_deny
 *
 * Reference: https://dotloop.github.io/public-api/#obtaining-access-token
 */

export const DOTLOOP_AUTH_URL         = 'https://auth.dotloop.com/oauth/authorize';
export const DOTLOOP_TOKEN_URL        = 'https://auth.dotloop.com/oauth/token';
export const DOTLOOP_TOKEN_REVOKE_URL = 'https://auth.dotloop.com/oauth/token/revoke';
export const DOTLOOP_API_BASE_URL     = 'https://api-gateway.dotloop.com/public/v2';
