import { NextRequest } from "next/server";

export type JwtUser = {
  id: string;
  role: string;
};

function isJwtUser(value: unknown): value is JwtUser {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "string" &&
    ["ADMIN", "USER"].includes(String((value as { role?: unknown }).role))
  );
}

export function getUser(req: NextRequest): JwtUser {
  const userHeader = req.headers.get("x-user");

  if (!userHeader) {
    throw new Error("Unauthorized");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(userHeader);
  } catch {
    throw new Error("Invalid user data");
  }

  // 🔒 Runtime validation
  if (!isJwtUser(parsed)) {
    throw new Error("Invalid user payload");
  }

  return parsed as JwtUser;
}
