import { isAuthenticated } from "@/app/lib/auth";
import { getProjects } from "@/app/lib/projects";
import AdminClient from "./AdminClient";
import LoginForm from "./LoginForm";

export default async function AdminPage() {
  const authed = isAuthenticated();

  if (!authed) {
    return <LoginForm />;
  }

  const projects = await getProjects();
  return <AdminClient initialProjects={projects} />;
}
