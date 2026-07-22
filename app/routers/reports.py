from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from app.database import get_db
from app.models import Student, Attendance, Subject, InternalExam, ExamMark

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/attendance/{subject_id}")
def get_attendance_report(subject_id: str, db: Session = Depends(get_db)):
    subject = db.get(Subject, subject_id.strip().upper())
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    records = db.exec(select(Attendance).where(Attendance.subject_id == subject.subject_code)).all()
    dates = set([r.date for r in records])
    total_classes = len(dates)
    
    if total_classes == 0:
        return {"subject": subject.subject_name, "total_classes": 0, "students": []}
        
    student_stats = {}
    for r in records:
        if r.student_id not in student_stats:
            student_stats[r.student_id] = {"present": 0, "total": total_classes}
        if r.status.lower() == "present":
            student_stats[r.student_id]["present"] += 1
            
    student_ids = list(student_stats.keys())
    students = db.exec(select(Student).where(Student.student_id.in_(student_ids))).all()
    
    result = []
    for s in students:
        stats = student_stats.get(s.student_id, {"present": 0, "total": total_classes})
        perc = (stats["present"] / total_classes) * 100 if total_classes > 0 else 0
        result.append({
            "student_id": s.student_id,
            "name": s.full_name,
            "attended": stats["present"],
            "total_classes": total_classes,
            "percentage": round(perc, 2)
        })
        
    result.sort(key=lambda x: x["student_id"]) # Sort by Enrollment Number
    return {"subject": f"{subject.subject_code} - {subject.subject_name}", "total_classes": total_classes, "students": result}

@router.get("/marks/compiled")
def get_compiled_marks(program: str, semester: int, exam_name: str, db: Session = Depends(get_db)):
    prog_filter = f"%{program.replace(' ', '%')}%" 
    subjects = db.exec(select(Subject).where(Subject.semester == semester, Subject.program.ilike(prog_filter))).all()
    
    if not subjects:
        return {"subjects": [], "students": []}
        
    subject_codes = [s.subject_code for s in subjects]
    subject_dicts = [{"code": s.subject_code, "name": s.subject_name} for s in subjects]
    
    exams = db.exec(select(InternalExam).where(InternalExam.subject_id.in_(subject_codes), InternalExam.exam_name == exam_name)).all()
    exam_ids = [e.id for e in exams]
    exam_map = {e.id: e.subject_id for e in exams} 
    
    if not exam_ids:
         return {"subjects": subject_dicts, "students": []}
         
    marks = db.exec(select(ExamMark).where(ExamMark.exam_id.in_(exam_ids))).all()
    students = db.exec(select(Student).where(Student.semester == semester, Student.program.ilike(prog_filter))).all()
    
    student_data = {}
    for s in students:
        student_data[s.student_id] = {
            "student_id": s.student_id,
            "name": s.full_name,
            "marks": {code: "-" for code in subject_codes},
            "total": 0
        }
        
    for m in marks:
        sub_code = exam_map[m.exam_id]
        if m.student_id in student_data:
            if m.is_absent:
                student_data[m.student_id]["marks"][sub_code] = "ABS"
            elif m.marks_obtained is not None:
                student_data[m.student_id]["marks"][sub_code] = m.marks_obtained
                student_data[m.student_id]["total"] += m.marks_obtained
                
    result_list = list(student_data.values())
    # THIS SORTS STUDENTS BY HIGHEST TOTAL MARKS (RANKING!)
    result_list.sort(key=lambda x: x["total"], reverse=True)
    
    return {
        "program": program,
        "semester": semester,
        "exam_name": exam_name,
        "subjects": subject_dicts,
        "students": result_list
    }