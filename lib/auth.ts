import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,

      mapProfileToUser: async (profile) => ({
        email: profile.email ?? `${profile.id}@users.noreply.github.com`,
        name: profile.name ?? profile.login,
      }),
    },
  },
  plugins: [nextCookies()], // make sure this is the last plugin in the array
});
