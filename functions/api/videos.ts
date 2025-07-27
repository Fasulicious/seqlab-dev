/// <reference types="@cloudflare/workers-types" />

import { createClerkClient } from '@clerk/backend';

interface Env {
  DB: D1Database;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  stream_uid: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // Authenticate the user
    const clerk = createClerkClient({
      secretKey: context.env.CLERK_SECRET_KEY,
      publishableKey: context.env.CLERK_PUBLISHABLE_KEY,
    });

    const requestState = await clerk.authenticateRequest(context.request);
    const auth = requestState.toAuth();

    if (!auth || !('userId' in auth) || auth.userId === null) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Fetch all videos from the database
    const { results } = await context.env.DB.prepare(
      'SELECT id, title, description, stream_uid FROM videos ORDER BY created_at DESC'
    ).all<Video>();

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error(error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
};
