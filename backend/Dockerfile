FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and ML
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and models
COPY . .

# Ensure data directory exists for local sessions
RUN mkdir -p data

EXPOSE 8000

ENV PYTHONUNBUFFERED=1

# Start uvicorn
CMD ["python", "-m", "uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8000"]
