# 📈 Price Tracker

A self-hosted price tracking application that monitors product prices over time and displays historical trends. Built with FastAPI, React, PostgreSQL, and Playwright.

![Python](https://img.shields.io/badge/Python-3.12-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ed) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791) ![Chakra UI](https://img.shields.io/badge/Chakra_UI-2.x-319795)

---

## Features

- **Track any product URL** — add a URL and a CSS selector to extract the price from any retail site
- **Scheduled scraping** — each product has its own configurable check interval (15 minutes to 24 hours)
- **Edit tracked products** — update the name, URL, CSS selector, interval, or pause tracking at any time
- **Price history graphs** — visualise how prices change over time with current, lowest, and highest price stats including the dates they occurred
- **Price alerts** — get email notifications when a price drops below a target, hits a new all-time low, or decreases since the last check
- **Multi-user support** — each user has their own tracked products and price history
- **Admin panel** — manage users and view all tracked products across the platform
- **Manual scrape trigger** — scrape any product on demand without waiting for the schedule
- **Error tracking** — failed scrapes are logged with error details so you know when something breaks

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Chakra UI, Recharts, React Query |
| Backend | Python 3.12, FastAPI, APScheduler |
| Scraping | Playwright (headless Chromium) |
| Database | PostgreSQL 16 |
| Auth | JWT (python-jose) + bcrypt |
| Notifications | Gmail SMTP (extensible to Telegram, Ntfy, Discord) |
| Infrastructure | Docker Compose, Nginx |

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/devoidx/price-tracker.git
cd price-tracker
```

2. **Create your `.env` file**
```bash
cp .env.example .env
```

Generate a secure secret key and add it to `.env`:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

3. **Configure email alerts (optional)**

See the [Email Alerts](#email-alerts) section below for full setup instructions.

4. **Build and start the application**
```bash
docker compose up --build
```

The first build takes a few minutes as it downloads Playwright and Chromium.

5. **Access the app**

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API docs | http://localhost:8000/docs |

6. **Log in with the default admin account**

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `changeme` |

> ⚠️ Change the admin password immediately after first login. Update the admin email address so alerts can be delivered:
> ```bash
> docker compose exec db psql -U tracker -d pricetracker -c "UPDATE users SET email = 'your@email.com' WHERE username = 'admin';"
> ```

---

## Usage

### Adding a product to track

1. Click **Track product** on the dashboard
2. Enter a name and the product URL
3. Optionally provide a CSS selector for the price element (see below)
4. Choose how often to check the price

### Editing a tracked product

1. Click on any product card to open the detail page
2. Click the **Edit** button
3. Update any field — name, URL, selector, interval, or active status
4. Click **Save changes**

Changing the interval takes effect immediately — the scheduler is updated without needing a restart.

### Finding a CSS selector

The CSS selector tells the scraper where to find the price on the page.

1. Right-click the price on the product page
2. Click **Inspect**
3. Right-click the highlighted element in DevTools → **Copy** → **Copy selector**
4. Paste it into the selector field

Some common selectors for popular UK retailers:

| Site | Selector |
|---|---|
| Amazon UK | `.a-price .a-offscreen` |
| eBay | `.x-price-primary` |
| Argos | `[data-test="product-price"]` |
| Currys | `.price` |

If no selector is provided, the scraper will attempt to detect the price automatically.

### Pausing tracking

To pause scraping without deleting a product and its history, click **Edit** on the product detail page and set the status to **Paused**. Set it back to **Active** to resume.

### Setting up alerts

On any product detail page, scroll down to the **Alerts** panel and click **Add alert**. Three alert types are available:

| Alert type | Description |
|---|---|
| Price drops below a threshold | Notifies you when the price falls below a specific amount you set |
| New all-time low | Notifies you when the product hits its lowest ever recorded price |
| Any price decrease | Notifies you whenever the price drops compared to the previous scrape |

Alerts can be toggled on/off or deleted at any time from the same panel.

### Running in the background
```bash
docker compose up -d
```

### Viewing logs
```bash
docker compose logs -f backend
```

---

## Email Alerts

Price Tracker uses Gmail to send alert notifications. You will need a Google account with 2-Step Verification enabled and a Gmail App Password.

### Step 1 — Enable 2-Step Verification

If you haven't already, enable 2-Step Verification on your Google account at [myaccount.google.com/security](https://myaccount.google.com/security). App Passwords are only available once this is enabled.

### Step 2 — Generate a Gmail App Password

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Sign in if prompted
3. In the **App name** field, type `Price Tracker`
4. Click **Create**
5. Google will display a 16-character password (e.g. `abcd efgh ijkl mnop`)
6. Copy this password — you will not be able to see it again

> ⚠️ This app password gives access to your Gmail account. Keep it secret and never commit it to version control.

### Step 3 — Add credentials to your `.env` file
```
GMAIL_ADDRESS=your.gmail.address@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

Enter the 16-character app password without spaces.

### Step 4 — Rebuild the backend
```bash
docker compose up --build -d backend
```

### Step 5 — Test the configuration

1. Go to `http://localhost:8000/docs`
2. Click **Authorize** and log in
3. Find `POST /alerts/test-email` and click **Try it out** → **Execute**
4. Check your inbox — a test alert email should arrive within a minute

If the email doesn't arrive, check the backend logs:
```bash
docker compose logs backend | grep -i "email\|gmail\|notif"
```

### Adding other notification providers

The notification system is designed to be extensible. To add a new provider (e.g. Telegram, Ntfy, Discord), create a new class in `backend/notifications.py` that extends `NotificationProvider` and implements the `send` method, then update `get_provider()`:
```python
class TelegramProvider(NotificationProvider):
    def send(self, subject: str, body: str, recipient: str) -> bool:
        # recipient is the Telegram chat_id
        ...

def get_provider() -> NotificationProvider:
    provider = os.getenv("NOTIFICATION_PROVIDER", "gmail")
    if provider == "telegram":
        return TelegramProvider()
    return GmailProvider()
```

No other files need to change — the alert logic and scraper are provider-agnostic.

---

## Customisation

### Changing the colour scheme

The theme is defined in `frontend/src/main.jsx`. Update the `brand` colour object:
```javascript
const theme = extendTheme({
  colors: {
    brand: {
      50:  '#e6fffa',
      100: '#b2f5ea',
      500: '#319795',
      600: '#2c7a7b',
      700: '#285e61',
    }
  }
})
```

Generate a full palette for any colour at [tints.dev](https://www.tints.dev).

### Changing the logo

Place your image in `frontend/public/` (e.g. `logo.jpg`) and update the `src` in `frontend/src/components/Navbar.jsx`:
```jsx
<img src="/logo.jpg" alt="Logo" style={{ height: '36px', width: 'auto', borderRadius: '6px' }} />
```

After any frontend changes, rebuild:
```bash
docker compose up --build -d frontend
```

---

## Accessing from other devices on your network

Find your machine's local IP:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Then visit `http://<your-ip>:3000` from any device on your network.

---

## Development

The backend uses a bind mount, so code changes are picked up automatically with hot reload.
```bash
# Start all services
docker compose up

# Rebuild a specific service after dependency changes
docker compose up --build backend

# Open a shell in the backend container
docker compose exec backend bash

# Connect to the database
docker compose exec db psql -U tracker -d pricetracker

# Wipe the database and start fresh (caution!)
docker compose down -v
docker compose up
```

---

## Project Structure
```
price-tracker/
├── docker-compose.yml
├── .env
├── .env.example
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── main.jsx              # App entry point + Chakra theme
│       ├── App.jsx               # Routes + auth guards
│       ├── index.css             # Minimal global styles
│       ├── api.js                # All API calls
│       ├── context/
│       │   └── AuthContext.jsx   # Auth state
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── ProductCard.jsx
│       │   ├── AddProductModal.jsx
│       │   ├── EditProductModal.jsx
│       │   ├── AlertsPanel.jsx
│       │   └── PriceChart.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── Dashboard.jsx
│           ├── ProductDetail.jsx
│           └── Admin.jsx
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── main.py                   # App entry point + scheduler startup
    ├── database.py               # DB connection
    ├── models.py                 # SQLAlchemy models
    ├── schemas.py                # Pydantic schemas
    ├── auth.py                   # JWT + password hashing
    ├── scraper.py                # Playwright scraper
    ├── scheduler.py              # APScheduler jobs
    ├── notifications.py          # Email/notification providers
    ├── alerts.py                 # Alert checking logic
    ├── db/
    │   └── init.sql              # Database schema + default admin user
    └── routers/
        ├── users.py              # Register, login, /me
        ├── products.py           # CRUD + scheduler integration
        ├── prices.py             # Price history + manual scrape trigger
        ├── alerts.py             # Alert CRUD + test email
        └── admin.py              # User and product management
```

---

## Troubleshooting

**Price not found automatically** — add a CSS selector manually. Right-click the price and use browser DevTools to find the element's class or ID.

**Selector found but price won't parse** — test in the browser console: `document.querySelector('.your-selector').innerText` to see what text is being returned.

**Site returns empty page or CAPTCHA** — the site may be detecting the headless browser. Some sites (particularly Amazon) actively block scrapers and may require selector updates periodically.

**Default admin login fails** — the bcrypt hash in `init.sql` may not match your environment. Generate a fresh one and update the database:
```bash
docker compose exec backend python3 -c "from passlib.context import CryptContext; ctx = CryptContext(schemes=['bcrypt'], deprecated='auto'); print(ctx.hash('changeme'))"
docker compose exec db psql -U tracker -d pricetracker -c "UPDATE users SET password_hash = '\$2b\$12\$<your-hash>' WHERE username = 'admin';"
```

**Alert emails not arriving** — check the backend logs with `docker compose logs backend | grep -i "email\|gmail"`. Common causes are an incorrect app password, 2-Step Verification not enabled, or the admin account email not being set. Use `POST /alerts/test-email` in the API docs to test the configuration.

**Container won't start** — check logs with `docker compose logs backend`. Common causes are database connection issues on first startup; the healthcheck should handle this but try `docker compose restart backend` if needed.

**Frontend showing stale UI after rebuild** — force a hard refresh with `Ctrl + Shift + R` or open in a private/incognito window.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## License

[MIT](LICENSE)
