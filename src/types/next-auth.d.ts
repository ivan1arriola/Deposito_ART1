import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    accountType: string;
    personalCi?: string | null;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email?: string | null;
      role: string;
      accountType: string;
      personalCi?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    accountType?: string;
    personalCi?: string | null;
  }
}
