"""Main entry point for FastAPI backend application."""
import uvicorn
from src.api.routes import app

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
