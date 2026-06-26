import { headers } from "next/headers";
import { resolveHostname } from "@/lib/domains";

/** Server komponentlarida hostname (Host + X-Forwarded-Host) */
export function getServerHostname(): string {
  const h = headers();
  return resolveHostname(h.get("host"), h.get("x-forwarded-host"));
}
