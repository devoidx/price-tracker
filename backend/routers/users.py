from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from pydantic import BaseModel
import models, schemas, auth

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=auth.hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form.username).first()
    if not user or not auth.verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = auth.create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.put("/me/password")
def change_password(body: PasswordChange, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not auth.verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    current_user.password_hash = auth.hash_password(body.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

class ProfileUpdate(BaseModel):
    email: str

@router.put("/me/profile")
def update_profile(body: ProfileUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    existing = db.query(models.User).filter(models.User.email == body.email, models.User.id != current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")
    current_user.email = body.email
    db.commit()
    db.refresh(current_user)
    return current_user
