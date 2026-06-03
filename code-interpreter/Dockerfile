# code-interpreter backend — container for Google Cloud Run / Fly / any Docker host.
# The heavy Python (pandas/matplotlib/…) runs REMOTELY in the E2B sandbox, so this
# image stays small — it only orchestrates + auths.
FROM python:3.12-slim

WORKDIR /app

# deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Cloud Run injects $PORT (default 8080). Shell form so $PORT expands; exec for clean signals.
ENV PORT=8080
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
