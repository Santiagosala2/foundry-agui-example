const DEFAULT_EMAIL_FALLBACK = "demo@example.com"

/**
 * Auth seam. There is no sign-in in this example, so every chat belongs to a
 * single configurable user. To enable real per-user chats, replace the body
 * with a session lookup (e.g. NextAuth's `auth()`) and throw when there is no
 * session — every server action resolves the Cosmos partition key through
 * this function, so no caller has to change. Async on purpose for that swap.
 */
export async function getCurrentUserEmail(): Promise<string> {
    return process.env.DEFAULT_USER_EMAIL ?? DEFAULT_EMAIL_FALLBACK
}
