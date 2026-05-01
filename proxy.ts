import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { JwtUser } from "./lib/getUser";
const SECRET = process.env.JWT_SECRET!;

type Role = "ADMIN" | "USER";

/**
 * 1. Public routes (no auth required)
 */
const PUBLIC_ROUTES = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/categories",
  "/api/products",
  "/api/auth/exchange"
];

/**
 * 2. Role-based rules (specific overrides)
 */
const ROLE_RULES: {
  pattern: RegExp;
  roles: string[];
}[] = [
  // ⚠️ Specific rules first
  { pattern: /^\/api\/orders\/.+\/status$/, roles: ["ADMIN"] },

  // General rule
  { pattern: /^\/api\/orders(\/.*)?$/, roles: ["ADMIN", "USER"] },
];


export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ✅ Allow public routes
  const isPublic = PUBLIC_ROUTES.some(
    (route) => path === route || path.startsWith(route + "/")
  );

  if (isPublic) {
    return NextResponse.next();
  }

  // 🔐 Require auth for everything else
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
  { success: false, message: "Unauthorized" },
  { status: 401 }
);
  }

  const token = authHeader.split(" ")[1];


let user: JwtUser;

try {
  const decoded = jwt.verify(token, SECRET);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof (decoded as any).id !== "string" ||
    typeof (decoded as any).role !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid token payload" },
      { status: 401 }
    );
  }

  user = decoded as JwtUser; // 👈 THIS line goes here
} catch {
  return NextResponse.json(
    { error: "Invalid token" },
    { status: 401 }
  );
}

  // 🔒 Apply role rules
  const matchedRule = ROLE_RULES.find((rule) =>
    rule.pattern.test(path)
  );

  if (matchedRule && !matchedRule.roles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 📦 Pass user downstream
  const headers = new Headers(req.headers);
  headers.set("x-user", JSON.stringify(user));

  return NextResponse.next({
    request: { headers },
  });
}

export const config = {
  matcher: ["/api/:path*"],
};