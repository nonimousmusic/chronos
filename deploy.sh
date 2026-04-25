#!/bin/bash

# Navigate to frontend and build
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Start backend (which now also serves the frontend)
echo "Starting production server on :8000..."
cd backend
pip install -r requirements.txt
python -m app.main --with-api
