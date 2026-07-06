import { redirect } from "next/navigation";

// "What We Do" was renamed to "Events" in the Wave 3 overhaul.
// This route is kept so old links keep working.
export default function WhatWeDoPage() {
  redirect("/Events");
}
