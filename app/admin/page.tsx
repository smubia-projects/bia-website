import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { getProjects } from "@/app/lib/projects";
import AdminClient from "./AdminClient";
import LoginForm from "./LoginForm";

const COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

function checkAuth(): boolean {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;

    const [timestamp, hmac] = token.split(".");
    if (!timestamp || !hmac) return false;

    const secret = process.env.ADMIN_PASSWORD;
    if (!secret) return false;

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > SESSION_MAX_AGE || age < 0) return false;

    const expected = createHmac("sha256", secret)
      .update(timestamp)
      .digest("hex");
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!checkAuth()) {
    return <LoginForm />;
  }

  const projects = await getProjects();
  return <AdminClient initialProjects={projects} />;
}
