import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

const handler = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "streaming user-read-email user-read-private", // Add necessary scopes
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token; // Store refresh token
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0; // Store expiry time
      }
      // TODO: Implement token refresh logic here if needed
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token from a provider.
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined; // Pass error state
      return session;
    },
  },
});

export { handler as GET, handler as POST };

// Define session type augmentation
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
  }
}

// Define JWT type augmentation
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
  }
}
