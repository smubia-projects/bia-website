import { headers } from "next/headers";
import { requireActorPage } from "@/app/lib/cms/session";
import { listTokens } from "@/app/lib/cms/tokens";
import TokensManager from "./TokensManager";

export default async function TokensPage() {
  const actor = await requireActorPage();
  const tokens = await listTokens(actor);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  return <TokensManager tokens={tokens} endpoint={`${origin}/api/mcp`} />;
}
