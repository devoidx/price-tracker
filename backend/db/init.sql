CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    selector TEXT,
    interval_minutes INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMP DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, url)
);

CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2),
    currency CHAR(3) DEFAULT 'GBP',
    scraped_at TIMESTAMP DEFAULT NOW(),
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_scraped_at ON price_history(scraped_at);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);

-- Default admin user (password: changeme)
-- bcrypt hash of 'changeme' with 12 rounds
INSERT INTO users (username, email, password_hash, is_admin)
VALUES (
    'admin',
    'admin@localhost',
    '$2b$12$wUpjw1/qqv82.kuvx6b5du5t.RAeVGdd5J1fMAgR/SBWZq/R7GhnO',
    TRUE
)
ON CONFLICT DO NOTHING;
