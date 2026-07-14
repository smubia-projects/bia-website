"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Admin.module.css";
import { AnimatePresence, motion } from "framer-motion";
import { AdminButton, AdminInput } from "./AdminMotion";

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
        <motion.div
          className={styles.loginCard}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowLine} />
            <span className={styles.eyebrowText}>Admin Access</span>
          </div>
          <h1 className={styles.loginHeading}>Project Admin</h1>
          <p className={styles.loginSubtext}>
            Enter the admin password to manage projects.
          </p>

          <form onSubmit={handleSubmit} method="post" className={styles.loginForm}>
            <AdminInput
              type="password"
              name="password"
              placeholder="Password"
              className={styles.input}
              required
              autoFocus
            />
            <AnimatePresence>
              {error && (
                <motion.p
                  className={styles.errorText}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <AdminButton
              type="submit"
              className={styles.primaryBtn}
              disabled={loading}
              effect="primary"
            >
              {loading ? "Signing in..." : "Sign In"}
            </AdminButton>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
