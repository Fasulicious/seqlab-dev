/// <reference types="@cloudflare/workers-types" />
import { createClerkClient } from '@clerk/backend';

interface Env {
  DB: D1Database;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
}

interface User {
  id: string;
  role: string;
}

const b64encode = (str: string) => btoa(unescape(encodeURIComponent(str)));

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const clerk = createClerkClient({ secretKey: context.env.CLERK_SECRET_KEY, publishableKey: context.env.CLERK_PUBLISHABLE_KEY });
    const requestState = await clerk.authenticateRequest(context.request);
    const auth = requestState.toAuth();

    if (!auth || !('userId' in auth)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { userId } = auth;

    const userQuery = await context.env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(userId).first<User>();
    if (!userQuery || userQuery.role !== 'admin') {
      return new Response('Forbidden: User is not an admin', { status: 403 });
    }

    const body = await context.request.json<{ name: string, title: string, description: string, size: number }>();

    const accountId = context.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = context.env.CLOUDFLARE_API_TOKEN;

    const streamResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': body.size.toString(),
        'Upload-Metadata': `name ${b64encode(body.title || body.name)}, requiresignedurls`
      },
    });

    if (!streamResponse.ok) {
      const errorText = await streamResponse.text();
      console.error('Cloudflare Stream API error:', errorText);
      return new Response('Failed to create upload URL', { status: 500 });
    }

    const uploadURL = streamResponse.headers.get('Location');
    const streamMediaId = streamResponse.headers.get('Stream-Media-Id');

    if (!uploadURL || !streamMediaId) {
      return new Response('Failed to get upload URL from Cloudflare Stream', { status: 500 });
    }

    const videoStmt = context.env.DB.prepare(
      'INSERT INTO videos (id, title, description, created_at, uploader_id, stream_uid) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const videoId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await videoStmt.bind(videoId, body.title, body.description, now, userId, streamMediaId).run();

    return new Response(JSON.stringify({ uploadURL }), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error(error)
    return new Response('Internal Server Error', { status: 500 });
  }
}
