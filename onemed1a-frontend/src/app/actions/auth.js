// src/app/actions/auth.js
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function logout() {
  const c = await cookies();
  c.set('userId', '', { path: '/', maxAge: 0, httpOnly: true });
  redirect('/login');
}
