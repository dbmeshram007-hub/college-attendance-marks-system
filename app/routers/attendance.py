from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import date
from sqlmodel import Session, select
from app.database import get_db
from app.models import Attendance, Subject

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

class AttendanceRecord(BaseModel):
    student_id: str
    status: str

class SubmitAttendancePayload(BaseModel):
    subject_id: str
    date: date
    records: List[AttendanceRecord]

@router.post("/submit")
def submit_attendance(payload: SubmitAttendancePayload, db: Session = Depends(get_db)):
    search_code = payload.subject_id.strip().upper()
    subject = db.get(Subject, search_code)
    
    # SMART FALLBACK: If user types "BP303TP" but DB has "BP303T"
    if not subject:
        import re
        base_match = re.match(r'([A-Z]+\d{3})', search_code)
        if base_match:
            base_code = base_match.group(1)
            subject = db.exec(select(Subject).where(Subject.subject_code.startswith(base_code))).first()
            if subject:
                search_code = subject.subject_code

    if not subject:
        raise HTTPException(status_code=404, detail=f"Subject '{payload.subject_id}' not found in database. Cannot save.")

    # Iterate through the records to save each student's attendance
    for rec in payload.records:
        entry = Attendance(
            student_id=rec.student_id,
            subject_id=search_code, # Use the corrected DB code
            date=payload.date,
            status=rec.status
        )
        db.add(entry)
    db.commit()
    return {"message": "Attendance saved successfully"}