# Setup

Run `services/create_bridge_network.sh`

Start the market services backend: `cd services/market_service/backend/infrastructure && docker compose up --build`
Start the market services frontend: `cd services/market_service/frontend && npm install && npm start`

Start the invoice services backend `cd services/invoice_services/backend/infrastructure && docker compose up --build`