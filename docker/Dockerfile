# Parivestra AI Tutor - Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose API port
EXPOSE 8001

# Start FastAPI backend with Uvicorn on port 8001
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8001"]
