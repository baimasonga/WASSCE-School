declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    /** Email of the ChatGPT account allowed to claim publishing once. Unset = setup closed. */
    SCHOOL_ADMIN_EMAIL?: string;
    BUCKET?: R2Bucket;
  }
}
