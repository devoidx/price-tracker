from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth

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

@router.get("/products", response_model=List[schemas.ProductOut])
def list_all_products(db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return db.query(models.Product).all()
