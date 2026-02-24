# 📈 Price Tracker

A self-hosted price tracking application that monitors product prices over time and displays historical trends. Built with FastAPI, React, PostgreSQL, and Playwright.

![Python](https://img.shields.io/badge/Python-3.12-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ed) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

---

## Features

- **Track any product URL** — add a URL and a CSS selector to extract the price from any retail site
- **Scheduled scraping** — each product has its own configurable check interval (15 minutes to 24 hours)
- **Price history graphs** — visualise how prices change over time with min/max stats
- **Multi-user support** — each user has their own tracked products and price history
- **Admin panel** — manage users and view all tracked products across the platform
- **Manual scrape trigger** — scrape any product on demand without waiting for the schedule
- **Error tracking** — failed scrapes are logged with error details so you know when something breaks

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Recharts, React Query |
| Backend | Python 3.12, FastAPI, APScheduler |
| Scraping | Playwright (headless Chromium) |
| Database | PostgreSQL 16 |
| Auth | JWT (python-jose) + bcrypt |
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
```

3. **Build and start the application**

```bash
docker compose up --build
```

The first build takes a few minutes as it downloads Playwright and Chromium.

4. **Access the app**

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API docs | http://localhost:8000/docs |

5. **Log in with the default admin account**

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `changeme` |

> ⚠️ Change the admin password immediately after first login.

---

## Usage

### Adding a product to track

1. Click **Track product** on the dashboard
2. Enter a name and the product URL
3. Optionally provide a CSS selector for the price element (see below)
4. Choose how often to check the price

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

### Running in the background

```bash
docker compose up -d
```

### Viewing logs

```bash
docker compose logs -f backend
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
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── api.js              # All API calls
│       ├── context/
│       │   └── AuthContext.jsx # Auth state
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── ProductCard.jsx
│       │   ├── AddProductModal.jsx
│       │   ├── EditProductModal.jsx
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
    ├── main.py                 # App entry point
    ├── database.py             # DB connection
    ├── models.py               # SQLAlchemy models
    ├── schemas.py              # Pydantic schemas
    ├── auth.py                 # JWT + password hashing
    ├── scraper.py              # Playwright scraper
    ├── scheduler.py            # APScheduler jobs
    ├── db/
    │   └── init.sql            # Database schema
    └── routers/
        ├── users.py
        ├── products.py
        ├── prices.py
        └── admin.py
```

---

## Troubleshooting

**Price not found automatically** — add a CSS selector manually. Right-click the price and use browser DevTools to find the element's class or ID.

**Selector found but price won't parse** — test in the browser console: `document.querySelector('.your-selector').innerText` to see what text is being returned.

**Site returns empty page or CAPTCHA** — the site may be detecting the headless browser. Some sites (particularly Amazon) actively block scrapers and may require selector updates periodically.

**Container won't start** — check logs with `docker compose logs backend`. Common causes are database connection issues on first startup; the healthcheck should handle this but try `docker compose restart backend` if needed.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## License

[MIT](LICENSE)
