import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Protect everything under /app/* and the (future) authed API routes.
// The public landing at "/" and the demo upload flow stay open.
const isProtectedRoute = createRouteMatcher([
  '/app(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
