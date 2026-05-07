import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from './db';
import type { User } from '@prisma/client';

/**
 * Returns the local DB User row for the currently signed-in Clerk user.
 * Lazily creates the row on first call if it doesn't exist.
 * Returns null if no user is signed in.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  let user = await db.user.findUnique({ where: { clerkId } });
  if (user) return user;

  // First time we're seeing this Clerk user — mirror them locally.
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error('Clerk user has no email address');
  }

  user = await db.user.create({
    data: { clerkId, email },
  });

  return user;
}

/**
 * Use in server components / route handlers when auth is required.
 * Throws if no user is signed in. Pair with Clerk middleware which redirects unauthed users.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
