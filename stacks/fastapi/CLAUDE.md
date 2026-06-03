# FastAPI — AI Coding Rules

## Version
- FastAPI 0.110+
- Python 3.11+
- Pydantic v2
- SQLAlchemy 2.0 (async) or SQLModel

## Project structure

```
app/
  main.py               # FastAPI app, router includes, lifespan
  api/
    v1/
      users.py          # Router for /api/v1/users
      products.py
  core/
    config.py           # Settings from env vars
    security.py         # JWT, password hashing
    database.py         # DB engine, session factory
  models/               # SQLAlchemy ORM models
  schemas/              # Pydantic request/response schemas
  services/             # Business logic (not in routes)
  dependencies.py       # FastAPI Depends() functions
```

## App setup

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.v1 import users, products
from app.core.database import engine
from app.models import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # shutdown
    await engine.dispose()

app = FastAPI(lifespan=lifespan)
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(products.router, prefix="/api/v1/products", tags=["products"])
```

## Schemas (Pydantic v2)

```python
# app/schemas/user.py
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)  # Pydantic v2 (not orm_mode)
```

## Routes

```python
# app/api/v1/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.schemas.user import UserCreate, UserResponse
from app.services.user import UserService

router = APIRouter()

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    session: AsyncSession = Depends(get_session),
):
    user = await UserService(session).get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,                           # validated request body
    session: AsyncSession = Depends(get_session),
):
    return await UserService(session).create(data)
```

## Dependencies

```python
# app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from app.core.security import verify_token
from app.services.user import UserService

security = HTTPBearer()

async def get_current_user(
    token = Depends(security),
    session: AsyncSession = Depends(get_session),
):
    payload = verify_token(token.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await UserService(session).get_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Usage in route
@router.get("/me", response_model=UserResponse)
async def me(current_user = Depends(get_current_user)):
    return current_user
```

## Settings (env vars)

```python
# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()  # validates on import — fails fast if env vars missing
```

## What to avoid

- ❌ Business logic in route handlers — put it in services
- ❌ Pydantic v1 syntax (`orm_mode = True`) — use `model_config = ConfigDict(from_attributes=True)`
- ❌ Synchronous DB calls with async routes — use `async with session` properly
- ❌ Catching all exceptions in routes — let FastAPI handle HTTPException
- ❌ `Optional[str]` — use `str | None` (Python 3.10+ union syntax)
- ❌ `class Config:` in Pydantic models — use `model_config = ConfigDict(...)`
