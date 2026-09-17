# MTC SmartBus

Intelligent transit management, real-time bus tracking, occupancy forecasting, and operator safety analytics.

---

## Quick Start (Local & VPS)

When you clone or `git pull` this repository:

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the template to `.env`:
```bash
cp .env.example .env
```
*(The application works out-of-the-box in `SMARTBUS_FEED_MODE=demo` without any external keys required.)*

### 3. Build the Application
```bash
npm run build
```

### 4. Run the Production Server
```bash
npm start
```
The app will be available at `http://localhost:3000` (or the port defined in `PORT`).

---

## Development Mode

To run with live hot reloading during development:
```bash
npm run dev
```

---

## Docker Deployment

To build and run as a standalone container:

```bash
# Build Docker image
docker build -t mtc-smartbus .

# Run container on port 3000
docker run -d -p 3000:3000 --name mtc-smartbus mtc-smartbus
```

---

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the Express server to listen on. |
| `NODE_ENV` | `production` | Environment mode (`development` or `production`). |
| `LOG_LEVEL` | `info` | Logger verbosity (`trace`, `debug`, `info`, `warn`, `error`). |
| `SMARTBUS_FEED_MODE` | `demo` | `demo` runs with simulated live fleet data; `provider` pulls from live MTC endpoints. |
| `SMARTBUS_FEED_TIMEOUT_MS` | `8000` | Request timeout for external feeds in milliseconds. |
| `BUSMAPS_API_KEY` | *(optional)* | BusMaps API key for extended route geospatial data. |
| `BUSMAPS_API_HOST` | `busmaps.com` | Hostname for the BusMaps API. |
| `MTC_CAMERA_FEED_URL` | *(optional)* | Live camera feed URL for video occupancy analytics. |
| `MTC_CAMERA_FEED_TOKEN` | *(optional)* | Authentication token for MTC camera endpoint. |
| `MTC_ETM_FEED_URL` | *(optional)* | Electronic Ticket Machine live feed URL. |
| `MTC_ETM_FEED_TOKEN` | *(optional)* | Authentication token for ETM feed endpoint. |
| `DATABASE_URL` | *(optional)* | PostgreSQL connection string for persistence. |

---

## One-Click Cloud Hosting

1. **Google Cloud Run / Render / Railway**:
   - Point your service to this GitHub repository.
   - Set the build command to: `npm run build`
   - Set the start command to: `npm start`
   - Set environment variables as needed (see table above).
2. **AI Studio Deploy**:
   - In Google AI Studio, click the **Share** or **Deploy** menu in the top bar to publish directly to Google Cloud Run.
