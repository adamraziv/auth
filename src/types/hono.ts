import type { PublicUser, PublicSessionRecord } from "./auth-contract.js";

export type AppVariables = {
  user: PublicUser | null;
  session: PublicSessionRecord | null;
};
