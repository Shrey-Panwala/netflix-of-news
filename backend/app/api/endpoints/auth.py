from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db.models.user import User

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    full_name: str
    preferences: List[str] = []


class LoginRequest(BaseModel):
    email: str


@router.post("/register")
async def register_user(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user with interest preferences for personalized news."""
    # Check if user already exists
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        # Update preferences and return
        existing.preferences = request.preferences
        existing.full_name = request.full_name
        await db.commit()
        await db.refresh(existing)
        return {
            "status": "updated",
            "user": {
                "id": existing.id,
                "email": existing.email,
                "full_name": existing.full_name,
                "preferences": existing.preferences,
            }
        }

    new_user = User(
        email=request.email,
        full_name=request.full_name,
        preferences=request.preferences,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "status": "created",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "preferences": new_user.preferences,
        }
    }


@router.post("/login")
async def login_user(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Simple email-based login for hackathon demo (no passwords)."""
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register first.")

    return {
        "status": "success",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "preferences": user.preferences,
        }
    }
