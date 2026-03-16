CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_super_admin BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    selector VARCHAR(255),
    interval_minutes INTEGER NOT NULL DEFAULT 60,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    price NUMERIC(10, 2),
    currency VARCHAR(10) DEFAULT 'GBP',
    scraped_at TIMESTAMP DEFAULT NOW(),
    error TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('price_drop', 'all_time_low', 'price_decreased')),
    threshold NUMERIC(10, 2),
    enabled BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS firefox_sites (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_source_id ON price_history(source_id);
CREATE INDEX IF NOT EXISTS idx_price_history_scraped_at ON price_history(scraped_at);
CREATE INDEX IF NOT EXISTS idx_sources_product_id ON sources(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_product_id ON alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);

-- Default settings
INSERT INTO settings (key, value) VALUES
    ('notification_provider', 'smtp'),
    ('gmail_address', ''),
    ('gmail_app_password', ''),
    ('smtp_host', ''),
    ('smtp_port', '587'),
    ('smtp_username', ''),
    ('smtp_password', ''),
    ('smtp_from_address', ''),
    ('smtp_use_tls', 'true'),
ON CONFLICT (key) DO NOTHING;

INSERT INTO firefox_sites (domain) VALUES ('argos.co.uk')
ON CONFLICT (domain) DO NOTHING;

-- Default admin user (password: changeme)
INSERT INTO users (username, email, password_hash, is_admin, is_super_admin)
VALUES (
    'admin',
    '',
    '$2b$12$YbTpFpGh4xTmkVZGFVhB0.8GpIHLZFMJjFKFQnbXKKoFcMKvlzDLi',
    TRUE,
    TRUE
) ON CONFLICT (username) DO NOTHING;

CREATE TABLE IF NOT EXISTS known_selectors (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    selector VARCHAR(255) NOT NULL,
    label VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(domain, selector)
);

INSERT INTO known_selectors (domain, selector, label) VALUES
    ('amazon.co.uk', '.a-offscreen', 'Main price'),
    ('currys.co.uk', '.prod-price', 'Main price'),
    ('argos.co.uk', 'h2', 'Main price'),
    ('ebay.co.uk', '.x-price-primary', 'Main price'),
    ('overclockers.co.uk', '.price__amount', 'Main price'),
    ('gadgetverse.co.uk', '.hM4gpp span', 'Main price'),
    ('cclonline.com', '.fw-bold.h4', 'Main price')
ON CONFLICT (domain, selector) DO NOTHING;
