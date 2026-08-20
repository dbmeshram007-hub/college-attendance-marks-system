from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List, Optional
import re

from app.database import get_db
from app.models import Student, Faculty, Subject, FacultyAllocation
from app.routers import attendance, marks, reports
from pydantic import BaseModel

# 1. Create the App
app = FastAPI(title="College Attendance & Marks API")

# 2. Fix CORS (Explicitly allowing Vercel frontend and all origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://college-attendance-marks-system.vercel.app",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Include our Routers
app.include_router(attendance.router)
app.include_router(marks.router)
app.include_router(reports.router)

# 4. Models
class ChangePasswordPayload(BaseModel):
    faculty_id: str
    old_password: str
    new_password: str

class AdminResetPasswordPayload(BaseModel):
    faculty_id: str

# 5. Core Endpoints
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
    subject = db.get(Subject, search_code)
    
    target_semester = None
    is_m_pharm = False
    
    if subject:
        target_semester = subject.semester
        if subject.program and ("M" in subject.program.upper() or "M." in subject.program.upper() or "MASTER" in subject.program.upper()):
            is_m_pharm = True
    else:
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
    
    if not students and target_semester:
        fallback_stmt = select(Student).where(Student.semester == target_semester)
        if batch and batch.strip() != "" and batch.strip() != "All":
            fallback_stmt = fallback_stmt.where(Batch_group.contains(batch.strip()))
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

@app.post("/api/faculty/change-password")
def change_password(payload: ChangePasswordPayload, db: Session = Depends(get_db)):
    faculty = db.get(Faculty, payload.faculty_id.strip())
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty member not found")
        
    current_pin = faculty.password if faculty.password else "1234"
    if payload.old_password != current_pin and payload.old_password != "1234":
        raise HTTPException(status_code=400, detail="Current password/PIN is incorrect.")
        
    faculty.password = payload.new_password
    db.add(faculty)
    db.commit()
    return {"message": "Password updated successfully!"}

@app.post("/api/admin/reset-faculty-password")
def admin_reset_password(payload: AdminResetPasswordPayload, db: Session = Depends(get_db)):
    faculty = db.get(Faculty, payload.faculty_id.strip())
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty member not found")
        
    faculty.password = "1234"
    db.add(faculty)
    db.commit()
    return {"message": f"Password for {faculty.name} has been reset to default (1234)."}

# ==========================================
# ADMIN MANAGEMENT CONSOLE ENDPOINTS
# ==========================================

@app.post("/api/admin/students")
def save_student(student: Student, db: Session = Depends(get_db)):
    db.merge(student)
    db.commit()
    return {"message": f"Student {student.full_name} saved successfully!"}

@app.delete("/api/admin/students/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    student = db.get(Student, student_id)
    if not student: raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    return {"message": "Student deleted completely."}

@app.post("/api/admin/faculty")
def save_faculty(faculty: Faculty, db: Session = Depends(get_db)):
    db.merge(faculty)
    db.commit()
    return {"message": f"Faculty {faculty.name} saved successfully!"}

@app.delete("/api/admin/faculty/{faculty_id}")
def delete_faculty(faculty_id: str, db: Session = Depends(get_db)):
    faculty = db.get(Faculty, faculty_id)
    if not faculty: raise HTTPException(status_code=404, detail="Faculty not found")
    db.delete(faculty)
    db.commit()
    return {"message": "Faculty deleted completely."}

@app.post("/api/admin/subjects")
def save_subject(subject: Subject, db: Session = Depends(get_db)):
    db.merge(subject)
    db.commit()
    return {"message": f"Subject {subject.subject_code} saved successfully!"}

@app.delete("/api/admin/subjects/{subject_code}")
def delete_subject(subject_code: str, db: Session = Depends(get_db)):
    subject = db.get(Subject, subject_code)
    if not subject: raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subject)
    db.commit()
    return {"message": "Subject deleted completely."}

@app.post("/api/admin/allocations")
def save_allocation(alloc: FacultyAllocation, db: Session = Depends(get_db)):
    base_sub_id = alloc.subject_id.upper().strip()
    alloc_type = alloc.allocation_type or 'Theory'
    
    # Smart Suffix Logic
    suffix = "_PRACTICAL" if "PRACTICAL" in alloc_type.upper() else "_THEORY"
    
    if base_sub_id.endswith("_THEORY") or base_sub_id.endswith("_PRACTICAL"):
        suffixed_sub_id = base_sub_id
        base_sub_id = base_sub_id.replace("_THEORY", "").replace("_PRACTICAL", "")
    else:
        suffixed_sub_id = f"{base_sub_id}{suffix}"
        
    existing_sub = db.get(Subject, suffixed_sub_id)
    if not existing_sub:
        base_sub = db.get(Subject, base_sub_id)
        if base_sub:
            new_sub = Subject(
                subject_code=suffixed_sub_id,
                subject_name=f"{base_sub.subject_name} ({alloc_type.capitalize()})",
                program=base_sub.program,
                specialization=base_sub.specialization,
                semester=base_sub.semester,
                lectures_per_week=base_sub.lectures_per_week,
                type=alloc_type.capitalize()
            )
            db.add(new_sub)
            db.commit()
        else:
            raise HTTPException(status_code=404, detail=f"Base subject '{base_sub_id}' missing. Create it in Subjects first.")
            
    alloc.subject_id = suffixed_sub_id
    db.merge(alloc)
    db.commit()
    return {"message": f"Allocation for {suffixed_sub_id} saved successfully!"}

@app.delete("/api/admin/allocations/{alloc_id}")
def delete_allocation(alloc_id: int, db: Session = Depends(get_db)):
    alloc = db.get(FacultyAllocation, alloc_id)
    if not alloc: raise HTTPException(status_code=404, detail="Allocation not found")
    db.delete(alloc)
    db.commit()
    return {"message": "Allocation removed."}