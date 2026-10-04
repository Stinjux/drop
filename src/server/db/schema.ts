/**
 * Schéma SQLite / libSQL. Chaque migration est appliquée une seule fois (table
 * schema_migrations). Ajouter une nouvelle entrée à la fin pour faire évoluer le schéma.
 */
export const migrations: Array<{ version: number; statements: string[] }> = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        locale TEXT NOT NULL,
        checkout_attempt_key TEXT NOT NULL UNIQUE,
        cart_fingerprint TEXT NOT NULL,

        stripe_checkout_session_id TEXT UNIQUE,
        stripe_checkout_url TEXT,
        stripe_session_expires_at TEXT,
        stripe_payment_intent_id TEXT,
        stripe_customer_id TEXT,
        stripe_livemode INTEGER,

        payment_status TEXT NOT NULL DEFAULT 'pending',
        paid_at TEXT,
        payment_failed_at TEXT,
        needs_review INTEGER NOT NULL DEFAULT 0,

        currency TEXT NOT NULL,
        subtotal_cents INTEGER NOT NULL,
        savings_cents INTEGER NOT NULL DEFAULT 0,
        shipping_cents INTEGER NOT NULL,
        tax_cents INTEGER,
        total_cents INTEGER NOT NULL,
        amount_paid_cents INTEGER,
        shipping_option_id TEXT NOT NULL,

        customer_email TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        ship_name TEXT,
        ship_line1 TEXT,
        ship_line2 TEXT,
        ship_city TEXT,
        ship_state TEXT,
        ship_postal_code TEXT,
        ship_country TEXT,

        fulfillment_status TEXT NOT NULL DEFAULT 'not_started',
        fulfillment_provider TEXT NOT NULL DEFAULT 'manual',
        supplier_order_id TEXT,
        supplier_ordered_at TEXT,
        supplier_cost_cents INTEGER,
        supplier_notes TEXT,
        carrier TEXT,
        tracking_number TEXT,
        tracking_url TEXT,
        shipped_at TEXT,

        confirmation_email_status TEXT,
        confirmation_email_at TEXT,
        shipping_email_status TEXT,
        shipping_email_at TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status)`,
      `CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL,
        variant_id TEXT NOT NULL,
        sku TEXT NOT NULL,
        product_name TEXT NOT NULL,
        variant_label TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price_cents INTEGER NOT NULL,
        line_total_cents INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id)`,
      `CREATE TABLE IF NOT EXISTS order_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        at TEXT NOT NULL,
        kind TEXT NOT NULL,
        message TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_events_order ON order_events(order_id)`,
      `CREATE TABLE IF NOT EXISTS stripe_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        checkout_session_id TEXT,
        order_id TEXT,
        received_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL
      )`,
    ],
  },
];
