import path from "path";

// UPLOAD_DIR lets a host point attachment storage at a persistent disk
// (e.g. Render/Railway) that lives outside the app's own checkout, since
// that checkout is wiped and re-cloned on every deploy. Defaults to
// public/uploads for local development.
export const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "public", "uploads");
