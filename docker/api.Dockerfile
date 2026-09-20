FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY api ./api

EXPOSE 8002

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8002"]
