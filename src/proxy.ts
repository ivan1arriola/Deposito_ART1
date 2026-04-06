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
     * - api/auth (authentication endpoints)
     * - api/extensions/soldado-widget (login/sync del widget)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|api/extensions/soldado-widget|auth/password-reset|auth/verify-email|manifest.webmanifest|sw.js|pwa-icons|_next/static|_next/image|favicon.ico|assets).*)",
  ],
};
