import type { auth } from "../lib/auth.js";

export type PublicSession = typeof auth.$Infer.Session;
export type PublicUser = PublicSession["user"];
export type PublicSessionRecord = PublicSession["session"];
export type PublicRole = "user" | "admin";
export type PublicSessionValidationResponse = PublicSession | null;
