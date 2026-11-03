import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { devLoginEnabled, googleConfigured, signIn } from "@/auth";
import { getCurrentActor } from "@/app/lib/cms/session";
import { ROLE_LABEL, ROLES } from "@/app/lib/cms/taxonomy";
import styles from "../cms.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in | SMUBIA CMS",
  robots: { index: false, follow: false },
};

const NO_ACCESS = "Account not on the CMS access list. An exco admin can add it under People and Roles.";
const ERRORS: Record<string, string> = {
  domain: "Sign-in requires an @smu.edu.sg Google account.",
  noaccess: NO_ACCESS,
  AccessDenied: NO_ACCESS,
  Configuration: "Sign-in failed. Retry from this page. If it persists, check the AUTH_* environment variables.",
};

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  if (await getCurrentActor()) redirect("/admin");
  const error = searchParams.error ? ERRORS[searchParams.error] ?? "Sign-in failed. Retry from this page." : null;

  async function google() {
    "use server";
    await signIn("google", { redirectTo: "/admin" });
  }

  async function dev(formData: FormData) {
    "use server";
    try {
      await signIn("dev", { role: String(formData.get("role")), redirectTo: "/admin" });
    } catch (e) {
      if (e instanceof AuthError) redirect("/admin/login?error=Configuration");
      throw e;
    }
  }

  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <div className={styles.row} style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "var(--ink)" }}>
          SMUBIA <span className={styles.status} style={{ background: "var(--surface-muted)", color: "var(--emerald)" }}>CMS</span>
        </div>
        <div>
          <h1 className={styles.h1} style={{ fontSize: 24 }}>
            CMS Sign-In
          </h1>
          <p className={styles.sub}>SMU Google accounts on the CMS access list.</p>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {googleConfigured ? (
          <form action={google}>
            <button type="submit" className={styles.btn} style={{ width: "100%" }}>
              Sign In with Google
            </button>
          </form>
        ) : (
          <p className={styles.hint}>Google sign-in not configured. Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.</p>
        )}
        {devLoginEnabled && (
          <form action={dev} className={styles.panelTight} style={{ background: "var(--bg)" }}>
            <span className={styles.monoLabel}>Local Development</span>
            <label className={styles.fld}>
              Role
              <select name="role" className={styles.inp} defaultValue="exco">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={styles.pill}>
              Sign In as Role
            </button>
            <span className={styles.hint}>Not available in production builds.</span>
          </form>
        )}
      </div>
    </div>
  );
}
