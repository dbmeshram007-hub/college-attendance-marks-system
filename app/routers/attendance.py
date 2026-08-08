from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import date, datetime
from sqlmodel import Session, select
from app.database import get_db
from app.models import Attendance, Subject
import re

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

# STIPULATED DEADLINE: Backfilling past attendance is allowed only until this date
BACKFILL_DEADLINE = date(2026, 9, 1)

class StudentRecord(BaseModel):
    student_id: str
    status: str

class SubmitAttendancePayload(BaseModel):
    subject_id: str
    date: date
    lecture_sequence: int = 1
    records: List[StudentRecord]
    is_faculty_backfill: bool = False

@router.post("/submit")
def submit_attendance(payload: SubmitAttendancePayload, db: Session = Depends(get_db)):
    search_code = payload.subject_id.strip().upper()
    subject = db.get(Subject, search_code)
    
    if not subject:
        clean_code = re.sub(r'[^A-Z0-9_]', '', search_code)
        match = re.search(r'([A-Z]+)(\d{3})', clean_code)
        if match:
            alpha = match.group(1)
            num = match.group(2)
            subject = db.exec(select(Subject).where(Subject.subject_code.ilike(f"%{alpha}%{num}%"))).first()
            if subject:
                search_code = subject.subject_code

    if not subject:
        raise HTTPException(status_code=404, detail=f"Subject '{payload.subject_id}' not found.")

    # TIME-BOUND CHECK FOR FACULTY BACKFILLING
    today = datetime.now().date()
    if payload.date < today:
        if payload.is_faculty_backfill:
            if today > BACKFILL_DEADLINE:
                raise HTTPException(
                    status_code=403, 
                    detail=f"⚠️ Backfill window has expired! The deadline to enter past attendance was {BACKFILL_DEADLINE.strftime('%d-%b-%Y')}."
                )

    for rec in payload.records:
        stmt = select(Attendance).where(
            Attendance.student_id == rec.student_id,
            Attendance.subject_id == search_code,
            Attendance.date == payload.date,
            Attendance.lecture_sequence == payload.lecture_sequence
        )
        existing = db.exec(stmt).first()

        if existing:
            existing.status = rec.status
        else:
            entry = Attendance(
                student_id=rec.student_id,
                subject_id=search_code,
                date=payload.date,
                lecture_sequence=payload.lecture_sequence,
                status=rec.status
            )
            db.add(entry)
            
    db.commit()
    return {"message": "Attendance saved successfully"}

@router.get("/records")
def get_attendance_records(subject_id: str, target_date: date, lecture_sequence: int = 1, db: Session = Depends(get_db)):
    search_code = subject_id.strip().upper()
    subject = db.get(Subject, search_code)
    if not subject:
        clean_code = re.sub(r'[^A-Z0-9_]', '', search_code)
        match = re.search(r'([A-Z]+)(\d{3})', clean_code)
        if match:
            alpha = match.group(1)
            num = match.group(2)
            subject = db.exec(select(Subject).where(Subject.subject_code.ilike(f"%{alpha}%{num}%"))).first()
            if subject:
                search_code = subject.subject_code

    records = db.exec(select(Attendance).where(
        Attendance.subject_id == search_code,
        Attendance.date == target_date,
        Attendance.lecture_sequence == lecture_sequence
    )).all()
    
    return {r.student_id: r.status for r in records}

@router.delete("/session")
def delete_attendance_session(
    subject_id: str, 
    target_date: date, 
    lecture_sequence: int = 1, 
    db: Session = Depends(get_db)
):
    search_code = subject_id.strip().upper()
    subject = db.get(Subject, search_code)
    if not subject:
        clean_code = re.sub(r'[^A-Z0-9_]', '', search_code)
        match = re.search(r'([A-Z]+)(\d{3})', clean_code)
        if match:
            alpha = match.group(1)
            num = match.group(2)
            subject = db.exec(select(Subject).where(Subject.subject_code.ilike(f"%{alpha}%{num}%"))).first()
            if subject:
                search_code = subject.subject_code

    records = db.exec(select(Attendance).where(
        Attendance.subject_id == search_code,
        Attendance.date == target_date,
        Attendance.lecture_sequence == lecture_sequence
    )).all()
    
    if not records:
        raise HTTPException(status_code=404, detail="No attendance records found for this specific date and lecture.")
        
    count = len(records)
    for r in records:
        db.delete(r)
        
    db.commit()
    return {"message": f"Successfully deleted {count} attendance records. The lecture has been completely removed."}