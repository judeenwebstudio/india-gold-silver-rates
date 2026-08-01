import { prisma } from '@/lib/prisma';
import { normalizeEmailAddress, signSchemeToken } from '@/lib/schemes/user-auth';
import { safeCustomerReturnTo } from '@/lib/customer-auth-return';

export const GOOGLE_SESSION_COOKIE = 'ratestack_scheme_session';

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  picture?: string;
};

type GoogleTokenInfo = {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  exp?: string;
  nonce?: string;
};

export class GoogleAuthError extends Error {
  constructor(public readonly code: string) {
    super('Google sign-in could not be completed. Please try again.');
  }
}

export function approvedGoogleAudiences(): string[] {
  return [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID].filter(
    (value): value is string => Boolean(value),
  );
}

export async function verifyGoogleIdToken(
  idToken: string,
  audiences = approvedGoogleAudiences(),
  expectedNonce?: string,
): Promise<GoogleIdentity> {
  if (!idToken || audiences.length === 0) throw new GoogleAuthError('GOOGLE_NOT_CONFIGURED');
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
    signal: AbortSignal.timeout(8_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new GoogleAuthError('INVALID_GOOGLE_TOKEN');
  const claims = await response.json() as GoogleTokenInfo;
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss || '')) {
    throw new GoogleAuthError('INVALID_ISSUER');
  }
  if (!claims.aud || !audiences.includes(claims.aud)) throw new GoogleAuthError('INVALID_AUDIENCE');
  if (!claims.exp || Number(claims.exp) <= Math.floor(Date.now() / 1000)) throw new GoogleAuthError('EXPIRED_TOKEN');
  if (expectedNonce && claims.nonce !== expectedNonce) throw new GoogleAuthError('INVALID_NONCE');
  if (!claims.sub || !claims.email) throw new GoogleAuthError('MISSING_GOOGLE_EMAIL');
  if (!(claims.email_verified === true || claims.email_verified === 'true')) {
    throw new GoogleAuthError('UNVERIFIED_GOOGLE_EMAIL');
  }
  return {
    sub: claims.sub,
    email: normalizeEmailAddress(claims.email),
    emailVerified: true,
    fullName: claims.name?.trim() || claims.email.split('@')[0],
    picture: claims.picture,
  };
}

export async function exchangeGoogleAuthorizationCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new GoogleAuthError('GOOGLE_NOT_CONFIGURED');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(8_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new GoogleAuthError('GOOGLE_CODE_EXCHANGE_FAILED');
  const body = await response.json() as { id_token?: string };
  if (!body.id_token) throw new GoogleAuthError('MISSING_ID_TOKEN');
  return body.id_token;
}

export async function signInOrCreateGoogleUser(identity: GoogleIdentity) {
  const user = await prisma.$transaction(async (tx) => {
    const linked = await tx.authAccount.findUnique({
      where: { provider_providerAccountId: { provider: 'GOOGLE', providerAccountId: identity.sub } },
      include: { user: true },
    });
    if (linked) {
      return tx.schemeUser.update({
        where: { id: linked.user.id },
        data: { lastLoginAt: new Date(), profileImageUrl: linked.user.profileImageUrl || identity.picture },
      });
    }

    const existingEmailUser = await tx.schemeUser.findUnique({ where: { email: identity.email } });
    if (existingEmailUser) {
      await tx.authAccount.create({
        data: {
          userId: existingEmailUser.id,
          provider: 'GOOGLE',
          providerAccountId: identity.sub,
          providerEmail: identity.email,
        },
      });
      return tx.schemeUser.update({
        where: { id: existingEmailUser.id },
        data: {
          emailVerifiedAt: existingEmailUser.emailVerifiedAt || new Date(),
          profileImageUrl: existingEmailUser.profileImageUrl || identity.picture,
          lastLoginAt: new Date(),
        },
      });
    }

    return tx.schemeUser.create({
      data: {
        fullName: identity.fullName,
        email: identity.email,
        emailVerifiedAt: new Date(),
        profileImageUrl: identity.picture,
        preferredLoginMethod: 'GOOGLE',
        passwordHash: null,
        lastLoginAt: new Date(),
        authAccounts: {
          create: {
            provider: 'GOOGLE',
            providerAccountId: identity.sub,
            providerEmail: identity.email,
          },
        },
      },
    });
  });

  if (!user.isActive || user.accountStatus !== 'ACTIVE') throw new GoogleAuthError('ACCOUNT_BLOCKED');
  const token = signSchemeToken(user.id, user.phone, user.fullName, user.email || undefined);
  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      authProvider: 'GOOGLE' as const,
      profileImageUrl: user.profileImageUrl,
    },
  };
}

export async function connectGoogleAccount(userId: string, identity: GoogleIdentity) {
  return prisma.$transaction(async (tx) => {
    const alreadyLinked = await tx.authAccount.findUnique({
      where: { provider_providerAccountId: { provider: 'GOOGLE', providerAccountId: identity.sub } },
    });
    if (alreadyLinked && alreadyLinked.userId !== userId) throw new GoogleAuthError('GOOGLE_ALREADY_LINKED');
    if (!alreadyLinked) {
      await tx.authAccount.create({
        data: { userId, provider: 'GOOGLE', providerAccountId: identity.sub, providerEmail: identity.email },
      });
    }
    return tx.schemeUser.update({
      where: { id: userId },
      data: { profileImageUrl: identity.picture, lastLoginAt: new Date() },
    });
  });
}

export function safeAuthRedirect(value: string | null | undefined): string {
  return safeCustomerReturnTo(value);
}
