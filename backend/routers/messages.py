import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/messages", tags=["messages"])


def create_system_message(recipient_id: int, subject: str, body: str, db: Session) -> None:
    try:
        msg = models.Message(
            sender_id=None,
            recipient_id=recipient_id,
            subject=subject,
            body=body,
            message_type="system",
        )
        db.add(msg)
        db.commit()
        logger.info(f"System message created for user {recipient_id}: {subject}")
    except Exception as e:
        logger.error(f"Failed to create system message for user {recipient_id}: {e}")


def _message_out(msg: models.Message) -> dict:
    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "sender_username": msg.sender.username if msg.sender else None,
        "recipient_id": msg.recipient_id,
        "subject": msg.subject,
        "body": msg.body,
        "message_type": msg.message_type,
        "is_read": msg.is_read,
        "created_at": msg.created_at,
    }


@router.get("/users", response_model=list[schemas.UserSummaryOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.User)
        .filter(models.User.active == True, models.User.id != current_user.id)
        .order_by(models.User.username)
        .all()
    )


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    count = (
        db.query(models.Message)
        .filter(
            models.Message.recipient_id == current_user.id,
            models.Message.is_read == False,
            models.Message.deleted_by_recipient == False,
        )
        .count()
    )
    return {"count": count}


@router.get("")
def get_inbox(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    messages = (
        db.query(models.Message)
        .filter(
            models.Message.recipient_id == current_user.id,
            models.Message.deleted_by_recipient == False,
        )
        .order_by(models.Message.created_at.desc())
        .all()
    )
    return [_message_out(m) for m in messages]


@router.post("", status_code=201)
def send_message(
    data: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if data.recipient_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send a message to yourself")
    recipient = db.query(models.User).filter(
        models.User.id == data.recipient_id, models.User.active == True
    ).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    msg = models.Message(
        sender_id=current_user.id,
        recipient_id=data.recipient_id,
        subject=data.subject,
        body=data.body,
        message_type="user",
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _message_out(msg)


@router.patch("/{message_id}/read")
def mark_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    msg = db.query(models.Message).filter(
        models.Message.id == message_id,
        models.Message.recipient_id == current_user.id,
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_read = True
    db.commit()
    return {"ok": True}


@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db.query(models.Message).filter(
        models.Message.recipient_id == current_user.id,
        models.Message.is_read == False,
        models.Message.deleted_by_recipient == False,
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}


@router.delete("/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    msg = db.query(models.Message).filter(
        models.Message.id == message_id,
        models.Message.recipient_id == current_user.id,
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.deleted_by_recipient = True
    db.commit()
    return {"ok": True}


@router.post("/system", status_code=201)
def send_system_message(
    data: schemas.SystemMessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin),
):
    if data.recipient_id is not None:
        recipient = db.query(models.User).filter(
            models.User.id == data.recipient_id, models.User.active == True
        ).first()
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient not found")
        recipients = [recipient]
    else:
        recipients = db.query(models.User).filter(models.User.active == True).all()

    for user in recipients:
        create_system_message(user.id, data.subject or "", data.body, db)

    return {"sent": len(recipients)}
