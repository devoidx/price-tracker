from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from pydantic import BaseModel, EmailStr
from typing import Optional

import models, schemas, auth

class AdminUserUpdate(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = None
    active: Optional[bool] = None

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return db.query(models.User).all()

@router.patch("/users/{user_id}/deactivate")
def deactivate_user(user_id: int, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.active = False
    db.commit()
    return {"message": f"User {user.username} deactivated"}

@router.patch("/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, updates: AdminUserUpdate, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if updates.email:
        existing = db.query(models.User).filter(models.User.email == updates.email, models.User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
    if updates.username:
        existing = db.query(models.User).filter(models.User.username == updates.username, models.User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user

@router.get("/products", response_model=List[schemas.ProductOut])
def list_all_products(db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return db.query(models.Product).all()
