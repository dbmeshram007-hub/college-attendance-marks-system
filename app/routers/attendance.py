from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import date
from sqlmodel import Session, select
from app.database import get_db
from app.models import Attendance, Subject
import re

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

class StudentRecord(BaseModel):
    student_id: str
    status: str

class SubmitAttendancePayload(BaseModel):
    subject_id: str
    date: date
    lecture_sequence: int = 1
    records: List[StudentRecord]

@router.post("/submit")
def submit_attendance(payload: SubmitAttendancePayload, db: Session = Depends(get_db)):
    search_code = payload.subject_id.strip().upper()
    subject = db.get(Subject, search_code)
    
    # Bulletproof fallback allowing underscores for Theory/Practical split
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

    for rec in payload.records:
        # 1. CHECK IF RECORD ALREADY EXISTS
        stmt = select(Attendance).where(
            Attendance.student_id == rec.student_id,
            Attendance.subject_id == search_code,
            Attendance.date == payload.date,
            Attendance.lecture_sequence == payload.lecture_sequence
        )
        existing = db.exec(stmt).first()

        if existing:
            # UPDATE existing record (Prevents 200% duplication)
            existing.status = rec.status
        else:
            # ADD new record
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


# ---------------------------------------------------------
# FETCH PAST ATTENDANCE (For Admin Editing)
# ---------------------------------------------------------
@router.get("/records")
def get_attendance_records(subject_id: str, target_date: date, lecture_sequence: int = 1, db: Session = Depends(get_db)):
    search_code = subject_id.strip().upper()
    
    # Bulletproof fallback allowing underscores for Theory/Practical split
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


# ---------------------------------------------------------
# DELETE PAST ATTENDANCE SESSION (Admin Only)
# ---------------------------------------------------------
@router.delete("/session")
def delete_attendance_session(
    subject_id: str, 
    target_date: date, 
    lecture_sequence: int = 1, 
    db: Session = Depends(get_db)
):
    search_code = subject_id.strip().upper()
    
    # Bulletproof fallback allowing underscores for Theory/Practical split
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

    # Find all records for this exact day, subject, and lecture number
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