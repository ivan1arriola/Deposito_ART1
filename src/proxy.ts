import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/",
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (los endpoints API validan auth/autorizacion dentro de cada route.ts)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|auth/password-reset|auth/verify-email|manifest.webmanifest|sw.js|pwa-icons|_next/static|_next/image|favicon.ico|assets).*)",
  ],
};
