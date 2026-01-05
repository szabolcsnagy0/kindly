import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, status
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .db import create_db_and_tables
from .routers import auth, common, help_seeker, volunteer, quest, badge
from .interfaces.exceptions import ServiceException


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield


load_dotenv()
API_ROUTES_PREFIX = "/api/v1"

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
]

if os.environ.get("DEV", False):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router, prefix=API_ROUTES_PREFIX)
app.include_router(common.router, prefix=API_ROUTES_PREFIX)
app.include_router(help_seeker.router, prefix=API_ROUTES_PREFIX)
app.include_router(volunteer.router, prefix=API_ROUTES_PREFIX)
app.include_router(quest.router, prefix=API_ROUTES_PREFIX)
app.include_router(badge.router, prefix=API_ROUTES_PREFIX)


@app.exception_handler(ServiceException)
async def service_exception_handler(request, exc: ServiceException):
    return JSONResponse(
        {
            "success": False,
            "error": {
                "code": exc.message.replace(" ", "_").upper(),
                "message": exc.message,
                "details": [],
            },
        },
        status_code=exc.status_code,
    )


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request, exc: RequestValidationError):
    return JSONResponse(
        {
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request",
                "details": [
                    {"field": e["loc"], "message": e["msg"]}
                    for e in exc.errors()
                ],
            },
        },
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
    )


@app.exception_handler(HTTPException)
async def validation_exception_handler(request, exc: HTTPException):
    error_codes = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        500: "INTERNAL_ERROR"
    }
    
    return JSONResponse(
        {
            "success": False,
            "error": {
                "code": error_codes.get(exc.status_code, f"HTTP_ERROR_{exc.status_code}"),
                "message": exc.detail,
                "details": [],
            },
        },
        status_code=exc.status_code,
    )
