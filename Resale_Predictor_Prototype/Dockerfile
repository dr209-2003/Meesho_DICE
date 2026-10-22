# Any container host (Render, Railway, Fly.io, Hugging Face Spaces): serves the page and the API on one port.
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt uvicorn
COPY api ./api
COPY public ./public
ENV PORT=8000
CMD ["sh", "-c", "uvicorn api.index:app --host 0.0.0.0 --port ${PORT}"]
