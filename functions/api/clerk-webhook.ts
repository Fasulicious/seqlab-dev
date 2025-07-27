/// <reference types="@cloudflare/workers-types" />

import { Webhook } from 'svix';

interface UserWebhookEvent {
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
  };
  object: 'event';
  type: 'user.created';
}

interface Env {
  DB: D1Database;
  CLERK_WEBHOOK_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const secret = context.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Clerk webhook secret not configured');
    return new Response('Error: Webhook secret not configured', { status: 500 } );
  }

  const headers = context.request.headers;
  const svix_id = headers.get('svix-id');
  const svix_timestamp = headers.get('svix-timestamp');
  const svix_signature = headers.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing headers', { status: 400 });
  }

  const payload = await context.request.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(secret);

  let evt: UserWebhookEvent;
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as UserWebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error: Could not verify webhook', { status: 400 });
  }

  if (evt.type !== 'user.created') {
    console.log('Ignoring non-user.created event:', evt.type);
    return new Response('Event type not handled', { status: 200 });
  }

  const { id, email_addresses } = evt.data;
  const email = email_addresses[0]?.email_address;

  if (!id || !email) {
    return new Response('Error: Invalid event data', { status: 400 });
  }

  try {
    const stmt = context.env.DB.prepare(
      'INSERT INTO users (id, email, role, created_at) VALUES (?, ?, ?, ?)'
    );
    const now = Math.floor(Date.now() / 1000);
    await stmt.bind(id, email, 'viewer', now).run();

    console.log(`Successfully inserted user: ${id} with email: ${email}`);
    return new Response('User created successfully', { status: 201 });
  } catch (err) {
    console.error('Error inserting user into database:', err);
    if (err.message.includes('UNIQUE constraint failed')) {
      return new Response('Error: User already exists', { status: 409 });
    }
    return new Response('Error: Could not insert user', { status: 500 });
  }
}
