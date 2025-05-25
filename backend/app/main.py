from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.api.v1.routes import router as v1_router


app = FastAPI()

@app.get("/healthz")
def health_check():
    return {"status": "ok"}

# Enable CORS to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict to your frontend URL in prod
    allow_credentials=True,
    allow_methods=["*"],  # Include OPTIONS, GET, POST, etc.
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api/v1")
