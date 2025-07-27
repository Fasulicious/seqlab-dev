/// <reference types="@cloudflare/workers-types" />
import { createClerkClient } from '@clerk/backend';

interface Env {
  DB: D1Database;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
}

interface User {
  id: string;
  role: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const clerk = createClerkClient({ secretKey: context.env.CLERK_SECRET_KEY, publishableKey: context.env.CLERK_PUBLISHABLE_KEY });
    const requestState = await clerk.authenticateRequest(context.request);
    const auth = requestState.toAuth();

    if (!auth || !('userId' in auth)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { userId } = auth;

    const userQuery = await context.env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(userId).first<User>();

    if (!userQuery) {
      return new Response('User not found in database', { status: 404 });
    }

    return new Response(JSON.stringify({ role: userQuery.role }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
