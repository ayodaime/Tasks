import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      department: string | null;
      subteams: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    department: string | null;
    subteams: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    department: string | null;
    subteams: string[];
  }
}
