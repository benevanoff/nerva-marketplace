# Nerva Marketplace

A marketplace where goods are bought and sold with NERVA (XNV). Buyers browse
listings, pay through NERVA invoices and follow their orders, vendors manage
their stock and shipments, all without a bank in sight.

The project is split in three parts:

| Part | Stack | What it does |
| --- | --- | --- |
| `frontend/` | React (Create React App) | the web app buyers and vendors use |
| `backend/market_service/` | FastAPI + MySQL + Redis | listings, users, carts, orders, reviews |
| `backend/invoice_service/` | FastAPI + MySQL + NERVA daemon | invoice addresses, payment detection, websocket updates |

## Features

For buyers:

- browse listings with search, sorting and pagination
- cart with per item shipping options and a shipping note at checkout
- XNV invoice with a live payment status, copyable address
- order history with invoice and shipping status
- reviews and star ratings on listings you have bought

For vendors:

- create listings with image upload, quantity and shipping options
- a management page to edit prices, quantities, or delist an item
- order view with buyer details and shipping notes
- mark orders as shipped

General:

- accounts with email activation, buyer or vendor
- dark mode following your system preference
- favorites kept in the browser
- quick navigation palette on ctrl+k
- skeleton loaders so pages feel fast instead of blank

## Quick Setup

Run `backend/create_bridge_network.sh` once so both backends share a docker network.

Start the market service backend:

```
cd backend/market_service/infrastructure && docker compose up --build
```

Start the invoice service backend:

```
cd backend/invoice_service/infrastructure && docker compose up --build
```

Start the frontend:

```
cd frontend && npm install && npm start
```

The frontend expects `REACT_APP_MARKET_MICROSERVICES` in `frontend/.env` to
point at the market service.

## Testing

The market service tests are integration tests, they run against the docker
compose stack. The easiest way is an interactive shell on the running container:

```
docker exec -it infrastructure-marketplace_rest_microservices-1 bash
python3 -m pytest tests
```

See [market service testing](backend/market_service/docs/testing.md) for details.

## Guides

- [User guide](docs/USER_GUIDE.md)
- [Vendor guide](docs/VENDOR_GUIDE.md)

## Backend docs

- [backend overview](backend/README.md)
- [market service architecture](backend/market_service/docs/architecture.md)
- [market service testing](backend/market_service/docs/testing.md)
- [invoice service architecture](backend/invoice_service/docs/architecture.md)
- [invoice service REST API](backend/invoice_service/docs/rest_api.md)

## Project structure

```
backend/
  market_service/      listings, users, carts, orders, reviews
  invoice_service/     invoices, payment scanning, websockets
  create_bridge_network.sh
docs/                  user and vendor guides
frontend/
  src/                 React app (pages, contexts, styles)
  public/              static assets
```

## Contributing

Pull requests are welcome. One feature per PR keeps review easy, and the
frontend build (`npm run build` in `frontend/`) should pass before you open one.
