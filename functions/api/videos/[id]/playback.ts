/// <reference types="@cloudflare/workers-types" />

import { createClerkClient } from '@clerk/backend';

interface Env {
  DB: D1Database;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLOUDFLARE_STREAM_KEY_ID: string;
  CLOUDFLARE_STREAM_JWK: string;
}

interface Video {
  stream_uid: string;
}

function arrayBufferToBase64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function objectToBase64url(payload) {
  return arrayBufferToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
}

async function sign(uid:string, keyId:string, jwkKey:string) {
  const encoder = new TextEncoder();

  const header = {
    alg: 'RS256',
    kid: keyId,
  }

  const data = {
    sub: uid,
    kid: keyId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
    accessRules: [
      {
        type: 'any',
        action: 'allow',
      }
    ]
  };
console.log(jwkKey);
  const token = `${objectToBase64url(header)}.${objectToBase64url(data)}`;
  const jwk = JSON.parse(atob(jwkKey));

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    encoder.encode(token)
  );

  const signedToken = `${token}.${arrayBufferToBase64Url(signature)}`;
  return signedToken;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const clerk = createClerkClient({
      secretKey: context.env.CLERK_SECRET_KEY,
      publishableKey: context.env.CLERK_PUBLISHABLE_KEY,
    });

    const requestState = await clerk.authenticateRequest(context.request);
    const auth = requestState.toAuth();
    if (!auth || !('userId' in auth) || auth.userId === null) {
      return new Response('Unauthorized', { status: 401 });
    }

    const videoId = context.params.id as string;
    const videoQuery = await context.env.DB.prepare(
      'SELECT stream_uid FROM videos WHERE id = ?'
    ).bind(videoId).first<Video>();

    if (!videoQuery) {
      return new Response('Video not found', { status: 404 });
    }

    const keyId = context.env.CLOUDFLARE_STREAM_KEY_ID;
    const jwkKey = context.env.CLOUDFLARE_STREAM_JWK;
    const token = await sign(videoQuery.stream_uid, keyId, jwkKey);

    return new Response(JSON.stringify({ token }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error(error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}
