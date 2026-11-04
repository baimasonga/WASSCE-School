declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    SCHOOL_PRIVATE_ADMIN?: string;
    BUCKET?: R2Bucket;
  }
}
