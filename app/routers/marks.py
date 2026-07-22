from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlmodel import Session, select
from app.database import get_db
from app.models import InternalExam, ExamMark, ExamStatusEnum, Subject

router = APIRouter(prefix="/api/marks", tags=["Exam Marks"])

class StudentMarkInput(BaseModel):
    student_id: str
    marks_obtained: Optional[float] = None
    is_absent: bool = False
    remarks: Optional[str] = None

class SubmitMarksPayload(BaseModel):
    exam_id: int
    action_type: str
    marks: List[StudentMarkInput]

@router.get("/exams/{subject_id}")
def get_or_create_exam(
    subject_id: str, 
    exam_name: str = "Sessional 1", 
    max_marks: float = 15.0, 
    db: Session = Depends(get_db)
):
    search_code = subject_id.strip().upper()
    
    # 1. Prevent Foreign Key crash by checking if subject exists!
    subject = db.get(Subject, search_code)
    
    # SMART FALLBACK: If user types "BP501TP" but DB has "BP501T"
    if not subject:
        import re
        base_match = re.match(r'([A-Z]+\d{3})', search_code)
        if base_match:
            base_code = base_match.group(1)
            subject = db.exec(select(Subject).where(Subject.subject_code.startswith(base_code))).first()
            if subject:
                search_code = subject.subject_code

    if not subject:
        raise HTTPException(
            status_code=404, 
            detail=f"Subject '{subject_id}' not found! Please check the exact subject code in the 'Subjects' tab (e.g. BP501T)."
        )

    # 2. Proceed with exam creation
    stmt = select(InternalExam).where(
        InternalExam.subject_id == search_code,
        InternalExam.exam_name == exam_name
    )
    exam = db.exec(stmt).first()
    if not exam:
        exam = InternalExam(
            subject_id=search_code,
            exam_name=exam_name,
            max_marks=max_marks,
            status=ExamStatusEnum.DRAFT
        )
        db.add(exam)
        db.commit()
        db.refresh(exam)
    return exam

@router.get("/records/{exam_id}")
def get_exam_marks(exam_id: int, db: Session = Depends(get_db)):
    marks = db.exec(select(ExamMark).where(ExamMark.exam_id == exam_id)).all()
    return marks

@router.post("/submit")
def submit_exam_marks(payload: SubmitMarksPayload, db: Session = Depends(get_db)):
    exam = db.get(InternalExam, payload.exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if exam.status == ExamStatusEnum.PUBLISHED:
        raise HTTPException(
            status_code=400, 
            detail="This exam is already published and locked."
        )
    
    for mark_data in payload.marks:
        if mark_data.marks_obtained is not None and mark_data.marks_obtained > exam.max_marks:
            raise HTTPException(
                status_code=400, 
                detail=f"Marks for {mark_data.student_id} exceed maximum ({exam.max_marks})"
            )
            
        stmt = select(ExamMark).where(
            ExamMark.exam_id == payload.exam_id,
            ExamMark.student_id == mark_data.student_id
        )
        existing = db.exec(stmt).first()
        
        if existing:
            existing.is_absent = mark_data.is_absent
            existing.marks_obtained = None if mark_data.is_absent else mark_data.marks_obtained
            existing.remarks = mark_data.remarks
        else:
            new_rec = ExamMark(
                exam_id=payload.exam_id,
                student_id=mark_data.student_id,
                is_absent=mark_data.is_absent,
                marks_obtained=None if mark_data.is_absent else mark_data.marks_obtained,
                remarks=mark_data.remarks
            )
            db.add(new_rec)
            
    if payload.action_type == 'publish':
        exam.status = ExamStatusEnum.PUBLISHED
    else:
        exam.status = ExamStatusEnum.DRAFT
        
    db.commit()
    return {
        "message": f"Marks successfully {'published' if payload.action_type == 'publish' else 'saved as draft'}.",
        "status": exam.status
    }