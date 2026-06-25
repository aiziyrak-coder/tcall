import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSocketIO } from "@/lib/socket-io";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  const checks: Record<string, "ok" | "error"> = {};

  // Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  // Socket.IO
  try {
    const io = getSocketIO();
    checks.socket = io ? "ok" : "error";
  } catch {
    checks.socket = "error";
  }

  // OpenAI configured
  checks.openai = process.env.OPENAI_API_KEY ? "ok" : "error";

  const allOk = Object.values(checks).every((v) => v === "ok");
  const status = allOk ? 200 : 503;

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      checks,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
    },
    { status }
  );
}
