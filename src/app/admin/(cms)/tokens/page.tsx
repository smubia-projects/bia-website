import { headers } from "next/headers";
import { requireActorPage } from "@/server/auth/session";
import { listTokens } from "@/server/people/tokens";
import TokensManager from "./TokensManager";

export default async function TokensPage() {
  const actor = await requireActorPage();
  const tokens = await listTokens(actor);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  return <TokensManager tokens={tokens} endpoint={`${origin}/api/mcp`} />;
}
