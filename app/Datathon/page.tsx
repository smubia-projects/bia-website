import { redirect } from "next/navigation";

// The Datathon now lives as a section on the What We Do page;
// this route is kept so old links keep working.
export default function DatathonPage() {
  redirect("/WhatWeDo#datathon");
}
