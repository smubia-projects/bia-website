"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Admin.module.css";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await fetch("/admin/api/login", {
      method: "POST",
      body: JSON.stringify({ password: formData.get("password") }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();

    if (data.success) {
      router.refresh();
    } else {
      setError(data.error || "Login failed");
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowLine} />
            <span className={styles.eyebrowText}>Admin Access</span>
          </div>
          <h1 className={styles.loginHeading}>Project Admin</h1>
          <p className={styles.loginSubtext}>
            Enter the admin password to manage projects.
          </p>

          <form onSubmit={handleSubmit} method="post" className={styles.loginForm}>
            <input
              type="password"
              name="password"
              placeholder="Password"
              className={styles.input}
              required
              autoFocus
            />
            {error && <p className={styles.errorText}>{error}</p>}
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
