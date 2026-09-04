# Root-level Dockerfile — build context is the entire repo root
# so both backend/ and ml/artifacts/ are accessible.

# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# System deps for CatBoost (needs C++ compiler) and psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim

# Runtime lib for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Backend source lands at /app/
WORKDIR /app
COPY backend/ /app/

# ML artifacts: config.py resolves Path(__file__).parent.parent.parent / "ml" / "artifacts"
# __file__ = /app/app/config.py  →  .parent^3 = /  →  final = /ml/artifacts
RUN mkdir -p /ml/artifacts
COPY ml/artifacts/ /ml/artifacts/

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
