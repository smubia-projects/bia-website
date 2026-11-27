import { redirectToCurrentRun } from "@/app/admin/(cms)/_run/load";

export default function DapAdminPage() {
  return redirectToCurrentRun("DAP");
}
