from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List, Optional
import re

from app.database import get_db
from app.models import Student, Faculty, Subject, FacultyAllocation
from app.routers import attendance, marks, reports

app = FastAPI(title="College Attendance & Marks API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(attendance.router)
app.include_router(marks.router)
app.include_router(reports.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the College API! Go to /docs to test the endpoints."}

@app.get("/api/students", response_model=List[Student])
def get_students(
    batch: Optional[str] = None, 
    subject_id: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    base_stmt = select(Student)
    if batch and batch.strip() != "" and batch.strip() != "All":
        batch_val = batch.strip()
        base_stmt = base_stmt.where(Student.batch_group.contains(batch_val))

    if not subject_id or subject_id.strip() == "":
        return db.exec(base_stmt).all()
        
    search_code = subject_id.strip().upper()
    
    # 1. NEW: Fetch exact subject from DB to get its exact semester and program
    subject = db.get(Subject, search_code)
    
    target_semester = None
    is_m_pharm = False
    
    if subject:
        target_semester = subject.semester
        prog_upper = subject.program.upper() if subject.program else ""
        # FIX: Check explicitly for M.PHARM so "B. PHARM" doesn't trigger this!
        if "M. PHARM" in prog_upper or "M.PHARM" in prog_upper or "MASTER" in prog_upper:
            is_m_pharm = True
    else:
        # Fallback if manual string was typed
        match = re.search(r'[A-Z]+(\d)\d{2}', search_code)
        if match:
            target_semester = int(match.group(1))
        else:
            digits = re.findall(r'\d', search_code)
            if digits:
                target_semester = int(digits[0])
                
        if search_code.startswith("MP") or search_code.startswith("M."):
            is_m_pharm = True

    stmt = base_stmt
    if target_semester:
        stmt = stmt.where(Student.semester == target_semester)
        
    if is_m_pharm:
        stmt = stmt.where(Student.program.ilike("%M%Pharm%"))
    else:
        stmt = stmt.where(Student.program.ilike("%B%Pharm%"))
        
    students = db.exec(stmt).all()
    
    # 3. ULTIMATE FALLBACK: If filters fail, just return all students in that semester
    if not students and target_semester:
        fallback_stmt = select(Student).where(Student.semester == target_semester)
        if batch and batch.strip() != "" and batch.strip() != "All":
            fallback_stmt = fallback_stmt.where(Student.batch_group.contains(batch.strip()))
        students = db.exec(fallback_stmt).all()
        
    return students

@app.get("/api/faculty", response_model=List[Faculty])
def get_faculty(db: Session = Depends(get_db)):
    return db.exec(select(Faculty)).all()

@app.get("/api/subjects", response_model=List[Subject])
def get_subjects(db: Session = Depends(get_db)):
    return db.exec(select(Subject)).all()

@app.get("/api/allocations", response_model=List[FacultyAllocation])
def get_allocations(db: Session = Depends(get_db)):
    return db.exec(select(FacultyAllocation)).all()