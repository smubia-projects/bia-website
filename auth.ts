import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { findAccess, upsertDevPerson } from "@/app/lib/cms/people";
import { ROLES, type Role } from "@/app/lib/cms/taxonomy";

/**
 * CMS sign-in. Production: Google, SMU accounts only, and the email must be on
 * the People list (or in CMS_BOOTSTRAP_ADMINS). Access is re-checked against
 * the database on every request (app/lib/cms/session.ts), so removing someone
 * ends their access immediately.
 *
 * Local development also gets a one-click "dev" sign-in with a chosen role.
 * It is compiled out of production builds (NODE_ENV check) and can be turned
 * off locally with CMS_DEV_LOGIN=0.
 */
export const devLoginEnabled =
  process.env.NODE_ENV !== "production" && process.env.CMS_DEV_LOGIN !== "0";

export const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret:
    process.env.AUTH_SECRET ??
    (devLoginEnabled ? "local-development-only-secret-do-not-use-in-production" : undefined),
  trustHost: true,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/admin/login", error: "/admin/login" },
  providers: [
    ...(googleConfigured
      ? [
          Google({
            // `hd` only filters Google's account picker; the domain is
            // enforced in the signIn callback below.
            authorization: { params: { hd: "smu.edu.sg", prompt: "select_account" } },
          }),
        ]
      : []),
    ...(devLoginEnabled
      ? [
          Credentials({
            id: "dev",
            name: "Local development",
            credentials: { role: {} },
            async authorize(credentials) {
              const role = String(credentials?.role ?? "") as Role;
              if (!ROLES.includes(role)) return null;
              const email = `dev-${role.replace("_", "-")}@localhost`;
              await upsertDevPerson(email, role);
              return { id: email, email, name: `Local ${role.replace("_", " ")}` };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const email = String(profile?.email ?? "").toLowerCase();
      if (!profile?.email_verified || !email.endsWith("@smu.edu.sg")) {
        return "/admin/login?error=domain";
      }
      if (!(await findAccess(email))) return "/admin/login?error=noaccess";
      return true;
    },
    jwt({ token, user }) {
      if (user?.email) token.email = user.email.toLowerCase();
      return token;
    },
  },
});
