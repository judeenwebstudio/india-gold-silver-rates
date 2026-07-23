import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { adminCredentialsSchema } from "@/lib/auth-validation";
import { prisma } from "@/lib/prisma";

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
  providers: [
    Credentials({
      name: "Administrator credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const result = adminCredentialsSchema.safeParse(credentials);

        if (!result.success) {
          return null;
        }

        const admin = await prisma.adminUser.findUnique({
          where: { email: result.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            isActive: true,
          },
        });

        if (!admin?.isActive) {
          return null;
        }

        const passwordMatches = await compare(
          result.data.password,
          admin.passwordHash,
        );

        if (!passwordMatches) {
          return null;
        }

        await prisma.adminUser.update({
          where: { id: admin.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        };
      },
    }),
  ],
});
