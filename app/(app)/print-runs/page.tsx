import { redirect } from "next/navigation";

// Print Runs have been moved to the Orders page (Print Runs tab).
export default function PrintRunsPage() {
  redirect("/orders");
}
