import { redirect } from "next/navigation";

// The Datathon section was removed from the Events page in Wave 3 (2026-07).
// This route is kept so old links keep working — it now lands on Events.
export default function DatathonPage() {
  redirect("/Events");
}
