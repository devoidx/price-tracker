# 📈 Price Tracker

A self-hosted price tracking application that monitors product prices over time and displays historical trends. Built with FastAPI, React, PostgreSQL, and Playwright.

![Python](https://img.shields.io/badge/Python-3.12-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ed) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791) ![Chakra UI](https://img.shields.io/badge/Chakra_UI-2.x-319795)

---

## Features

- **Track any product URL** — add a product and attach up to 5 sources (URLs) from different retailers
- **Multi-source price comparison** — compare prices across retailers on a single graph, each source shown as its own line
- **Scheduled scraping** — each source has its own configurable check interval (15 minutes to 24 hours)
- **Persistent scheduler** — scrape schedules survive backend restarts and maintain their original timing
- **Price history graphs** — visualise how prices change over time with current, lowest, and highest price stats
- **Price alerts** — get email notifications when a price drops below a target, hits a new all-time low, or decreases since the last check
- **User profiles** — users can update their email address and change their password
- **Multi-user support** — each user has their own tracked products and price history
- **Admin panel** — manage users, edit profiles, grant admin access, and view scrape errors across all products
- **Manual scrape trigger** — scrape any product or individual source on demand
- **Error tracking** — failed scrapes are logged with error details on the product detail page

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Chakra UI, Recharts, React Query |
| Backend | Python 3.12, FastAPI, APScheduler |
| Scraping | Playwright (Chromium + Firefox fallback for bot-protected sites) |
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

Your `.env` should look like:
```
SECRET_KEY=your-generated-secret-key-here
GMAIL_ADDRESS=your.gmail.address@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

3. **Build and start the application**
```bash
docker compose up --build
```

The first build takes a few minutes as it downloads Playwright, Chromium, and Firefox.

4. **Access the app**

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API docs | http://localhost:8000/docs |

> The frontend port can be changed in `docker-compose.yml` if 3000 is already in use on your machine.

5. **Log in with the default admin account**

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `changeme` |

> ⚠️ Change the admin password immediately after first login via the **Profile** page. Update the admin email address so alerts can be delivered:
> ```bash
> docker compose exec db psql -U tracker -d pricetracker -c "UPDATE users SET email = 'your@email.com' WHERE username = 'admin';"
> ```

---

## Usage

### Adding a product

1. Click **Track product** on the dashboard
2. Enter a product name (e.g. "PS5 Controller")
3. Click the product card to open the detail page
4. In the **Sources** panel, click **Add source** to add a retailer URL

### Adding sources

Each product can have up to 5 sources. For each source:

1. Enter the retailer URL
2. Optionally enter a label (e.g. "Amazon") — auto-generated from the URL if left blank
3. Optionally enter a CSS selector for the price element (see below)
4. Choose how often to check the price

Sources can be edited, paused, or deleted individually from the Sources panel.

### Finding a CSS selector

The CSS selector tells the scraper where to find the price on the page.

1. Right-click the price on the product page
2. Click **Inspect**
3. Right-click the highlighted element in DevTools → **Copy** → **Copy selector**
4. Paste it into the selector field

If no selector is provided, the scraper will attempt to detect the price automatically.

Some common selectors for popular UK retailers:

| Site | Selector |
|---|---|
| Amazon UK | `.a-offscreen` |
| Currys | `.prod-price` |
| Argos | `h2` |
| eBay | `.x-price-primary` |

### Scraper compatibility

The scraper uses Chromium by default. For sites that block Chromium, Firefox is used automatically. Known compatibility:

| Retailer | Status |
|---|---|
| Amazon UK | ✅ Working |
| Currys | ✅ Working |
| Argos | ✅ Working (Firefox) |
| eBay | ✅ Working |
| John Lewis | ❌ Blocked |

### Price comparison graph

When a product has multiple sources, the price history graph shows one line per source in different colours. Hover over any point to see the source name and price.

### Setting up alerts

On any product detail page, scroll down to the **Alerts** panel and click **Add alert**. Three alert types are available:

| Alert type | Description |
|---|---|
| Price drops below a threshold | Notifies you when the price falls below a specific amount you set |
| New all-time low | Notifies you when the product hits its lowest ever recorded price |
| Any price decrease | Notifies you whenever the price drops compared to the previous scrape |

Alerts are evaluated across all sources for a product — if any source hits the condition, you'll be notified.

### User profile

Click **Profile** in the navbar to update your email address or change your password.

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

Enable 2-Step Verification on your Google account at [myaccount.google.com/security](https://myaccount.google.com/security).

### Step 2 — Generate a Gmail App Password

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. In the **App name** field, type `Price Tracker`
3. Click **Create**
4. Copy the 16-character password — you will not be able to see it again

> ⚠️ Keep this password secret and never commit it to version control.

### Step 3 — Add credentials to your `.env` file
```
GMAIL_ADDRESS=your.gmail.address@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

### Step 4 — Test the configuration

1. Go to `http://localhost:8000/docs`
2. Click **Authorize** and log in
3. Find `POST /alerts/test-email` and click **Try it out** → **Execute**
4. Check your inbox

### Adding other notification providers

The notification system is extensible. To add a new provider (e.g. Telegram, Ntfy, Discord), add a new class to `backend/notifications.py` and update `get_provider()`:
```python
class TelegramProvider(NotificationProvider):
    def send(self, subject: str, body: str, recipient: str) -> bool:
        ...

def get_provider() -> NotificationProvider:
    provider = os.getenv("NOTIFICATION_PROVIDER", "gmail")
    if provider == "telegram":
        return TelegramProvider()
    return GmailProvider()
```

---

## Admin Panel

The admin panel is accessible from the navbar for users with admin access. It provides:

- **User management** — view all users, edit username, email, admin status, and active status
- **Product overview** — view all tracked products across all users with scrape error details

To reset the admin password from the command line:
```bash
sudo docker compose exec db psql -U tracker -d pricetracker
```

Then inside psql:
```sql
UPDATE users SET password_hash = 'paste-hash-here' WHERE username = 'admin';
\q
```

Generate a fresh hash with:
```bash
sudo docker compose exec backend python3 -c "from passlib.context import CryptContext; ctx = CryptContext(schemes=['bcrypt'], deprecated='auto'); print(ctx.hash('yourpassword'))"
```

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

Generate a full palette at [tints.dev](https://www.tints.dev).

### Changing the logo

Place your image in `frontend/public/` and update `frontend/src/components/Navbar.jsx`:
```jsx
<img src="/logo.jpg" alt="Logo" style={{ height: '36px', width: 'auto', borderRadius: '6px' }} />
```

After any frontend changes, rebuild:
```bash
docker compose up --build -d frontend
```

---

## Accessing from other devices on your network
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Then visit `http://<your-ip>:3000` from any device on your network.

---

## Development
```bash
# Start all services
docker compose up

# Rebuild a specific service
docker compose up --build backend

# Open a shell in the backend container
docker compose exec backend bash

# Connect to the database
docker compose exec db psql -U tracker -d pricetracker

# Wipe the database and start fresh (caution — deletes all data)
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
│       │   ├── SourcesPanel.jsx
│       │   ├── AlertsPanel.jsx
│       │   └── PriceChart.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Register.jsx
│           ├── Dashboard.jsx
│           ├── ProductDetail.jsx
│           ├── Profile.jsx
│           └── Admin.jsx
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── main.py                   # App entry point + scheduler startup
    ├── database.py               # DB connection
    ├── models.py                 # SQLAlchemy models
    ├── schemas.py                # Pydantic schemas
    ├── auth.py                   # JWT + password hashing
    ├── scraper.py                # Playwright scraper (Chromium + Firefox)
    ├── scheduler.py              # APScheduler jobs (persisted to PostgreSQL)
    ├── notifications.py          # Email/notification providers
    ├── alerts.py                 # Alert checking logic
    ├── db/
    │   └── init.sql              # Database schema + default admin user
    └── routers/
        ├── users.py              # Register, login, /me, password change
        ├── products.py           # Product + source CRUD + scheduler
        ├── prices.py             # Price history + scrape triggers + debug
        ├── alerts.py             # Alert CRUD + test email
        └── admin.py              # User and product management
```

---

## Troubleshooting

**Price not found automatically** — add a CSS selector manually. Right-click the price in your browser and use DevTools to find the element's class or ID. Use the `GET /prices/source/{source_id}/debug` endpoint in the API docs to inspect what elements the scraper can see on the page.

**Selector found but price won't parse** — the selector may be returning text that includes extra content (e.g. "£29.99 Save £7.00"). Use a more specific selector that targets just the price element. Check the debug endpoint to see exactly what text is being returned.

**Site returns 403 or Access Denied** — the site is blocking the scraper. Argos is handled automatically with Firefox. For other blocked sites, try adding them to `FIREFOX_SITES` in `backend/scraper.py`. If that doesn't work, the site may require a paid proxy service.

**Scheduler not firing** — check logs with `docker compose logs backend | grep -i "schedul\|❌\|⚠️"`. Make sure `--reload` is not present in the backend Dockerfile CMD as it interferes with APScheduler.

**Alert emails not arriving** — check logs with `docker compose logs backend | grep -i "email\|gmail"`. Use `POST /alerts/test-email` in the API docs to test. Common causes are incorrect app password or account email not being set.

**Default admin login fails** — generate a fresh hash and update via psql as described in the Admin Panel section.

**Frontend showing stale UI after rebuild** — hard refresh with `Ctrl + Shift + R` or open in a private/incognito window.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## License

[MIT](LICENSE)
