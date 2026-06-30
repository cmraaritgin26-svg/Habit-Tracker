const ENABLE_ACCOUNT_LIMITS = process.env.ENABLE_ACCOUNT_LIMITS === "true";
const DATABASE_URL = process.env.DATABASE_URL || "";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "";
const GOOGLE_PLAY_PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME || "com.tasklensai.app";
const FREE_BEFORE_PHOTO_LIMIT = Number(process.env.FREE_BEFORE_PHOTO_LIMIT || 5);
const PREMIUM_BEFORE_PHOTO_LIMIT = Number(process.env.PREMIUM_BEFORE_PHOTO_LIMIT || 35);
const PREMIUM_AFTER_IMAGE_LIMIT = Number(process.env.PREMIUM_AFTER_IMAGE_LIMIT || 35);

let pool;
let firebaseAuth;
let androidPublisher;

export function isAccountLimitEnforcementEnabled() {
  return ENABLE_ACCOUNT_LIMITS;
}

export async function initializeAccountLimits() {
  if (!ENABLE_ACCOUNT_LIMITS) return;
  if (!DATABASE_URL) throw new Error("DATABASE_URL is required when ENABLE_ACCOUNT_LIMITS=true.");
  if (!FIREBASE_PROJECT_ID) throw new Error("FIREBASE_PROJECT_ID is required when ENABLE_ACCOUNT_LIMITS=true.");

  const [{ Pool }, adminApp, adminAuth] = await Promise.all([
    import("pg"),
    import("firebase-admin/app"),
    import("firebase-admin/auth")
  ]);
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
  });
  const app = adminApp.getApps().length
    ? adminApp.getApp()
    : adminApp.initializeApp({ credential: adminApp.applicationDefault(), projectId: FIREBASE_PROJECT_ID });
  firebaseAuth = adminAuth.getAuth(app);
  await createAccountLimitSchema();
}

export async function authenticateAccount(request) {
  if (!ENABLE_ACCOUNT_LIMITS) return null;
  const authorization = String(request.headers.authorization || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw httpError(401, "Sign in is required.");
  try {
    const decoded = await firebaseAuth.verifyIdToken(match[1], true);
    await pool.query(
      `INSERT INTO users (id, email, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()`,
      [decoded.uid, decoded.email || null]
    );
    return { id: decoded.uid, email: decoded.email || null };
  } catch {
    throw httpError(401, "Your sign-in session is invalid or expired.");
  }
}

export async function getAccountUsage(userId) {
  if (!ENABLE_ACCOUNT_LIMITS) return null;
  const period = currentPeriod();
  const premium = await hasActivePremiumSubscription(userId);
  const usage = await getUsageRow(userId, period);
  return {
    period,
    premium,
    beforePhotoCount: usage.before_photo_count,
    beforePhotoLimit: premium ? PREMIUM_BEFORE_PHOTO_LIMIT : FREE_BEFORE_PHOTO_LIMIT,
    afterImageCount: usage.after_image_count,
    afterImageLimit: premium ? PREMIUM_AFTER_IMAGE_LIMIT : 0
  };
}

export async function reserveUsage(userId, kind) {
  if (!ENABLE_ACCOUNT_LIMITS) return null;
  const period = currentPeriod();
  const premium = await hasActivePremiumSubscription(userId);
  const column = kind === "after_image" ? "after_image_count" : "before_photo_count";
  const limit = kind === "after_image"
    ? (premium ? PREMIUM_AFTER_IMAGE_LIMIT : 0)
    : (premium ? PREMIUM_BEFORE_PHOTO_LIMIT : FREE_BEFORE_PHOTO_LIMIT);
  if (limit <= 0) throw httpError(403, "Premium is required for after pictures.");

  await pool.query(
    `INSERT INTO monthly_usage (user_id, period, before_photo_count, after_image_count, updated_at)
     VALUES ($1, $2, 0, 0, NOW())
     ON CONFLICT (user_id, period) DO NOTHING`,
    [userId, period]
  );
  const result = await pool.query(
    `UPDATE monthly_usage
     SET ${column} = ${column} + 1, updated_at = NOW()
     WHERE user_id = $1 AND period = $2 AND ${column} < $3
     RETURNING before_photo_count, after_image_count`,
    [userId, period, limit]
  );
  if (!result.rowCount) throw httpError(429, `Monthly ${kind === "after_image" ? "after picture" : "before-photo checklist"} limit reached.`);
  return { userId, period, kind };
}

export async function refundUsage(reservation) {
  if (!ENABLE_ACCOUNT_LIMITS || !reservation) return;
  const column = reservation.kind === "after_image" ? "after_image_count" : "before_photo_count";
  await pool.query(
    `UPDATE monthly_usage
     SET ${column} = GREATEST(0, ${column} - 1), updated_at = NOW()
     WHERE user_id = $1 AND period = $2`,
    [reservation.userId, reservation.period]
  );
}

export async function verifyGooglePlaySubscription(userId, purchaseToken) {
  if (!ENABLE_ACCOUNT_LIMITS) throw httpError(503, "Account limits are not enabled.");
  if (!purchaseToken) throw httpError(400, "Missing Google Play purchase token.");
  if (!androidPublisher) {
    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/androidpublisher"]
    });
    androidPublisher = google.androidpublisher({ version: "v3", auth });
  }
  const response = await androidPublisher.purchases.subscriptionsv2.get({
    packageName: GOOGLE_PLAY_PACKAGE_NAME,
    token: purchaseToken
  });
  const subscription = response.data || {};
  const lineItem = Array.isArray(subscription.lineItems) ? subscription.lineItems[0] : null;
  const productId = String(lineItem?.productId || "");
  const expiresAt = lineItem?.expiryTime ? new Date(lineItem.expiryTime) : null;
  const state = String(subscription.subscriptionState || "");
  const entitledStates = new Set([
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_CANCELED",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
  ]);
  const active = Boolean(expiresAt && expiresAt.getTime() > Date.now() && entitledStates.has(state));
  await pool.query(
    `INSERT INTO subscriptions (user_id, provider, purchase_token, product_id, status, expires_at, updated_at)
     VALUES ($1, 'google_play', $2, $3, $4, $5, NOW())
     ON CONFLICT (provider, purchase_token)
     DO UPDATE SET user_id = EXCLUDED.user_id, product_id = EXCLUDED.product_id, status = EXCLUDED.status, expires_at = EXCLUDED.expires_at, updated_at = NOW()`,
    [userId, purchaseToken, productId, active ? "active" : state || "inactive", expiresAt]
  );
  return { active, productId, status: active ? "active" : state || "inactive", expiresAt: expiresAt?.toISOString() || null };
}

async function createAccountLimitSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      purchase_token TEXT NOT NULL,
      product_id TEXT,
      status TEXT NOT NULL,
      expires_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (provider, purchase_token)
    );
    CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx ON subscriptions (user_id, status, expires_at);
    CREATE TABLE IF NOT EXISTS monthly_usage (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period TEXT NOT NULL,
      before_photo_count INTEGER NOT NULL DEFAULT 0,
      after_image_count INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, period)
    );
  `);
}

async function hasActivePremiumSubscription(userId) {
  const result = await pool.query(
    `SELECT 1 FROM subscriptions
     WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
     LIMIT 1`,
    [userId]
  );
  return Boolean(result.rowCount);
}

async function getUsageRow(userId, period) {
  const result = await pool.query(
    `SELECT before_photo_count, after_image_count FROM monthly_usage WHERE user_id = $1 AND period = $2`,
    [userId, period]
  );
  return result.rows[0] || { before_photo_count: 0, after_image_count: 0 };
}

function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
