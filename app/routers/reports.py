from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from app.database import get_db
from app.models import Student, Attendance, Subject, InternalExam, ExamMark
import re
router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/attendance/compiled")
def get_compiled_attendance(program: str, semester: int, db: Session = Depends(get_db)):
    
    # 1. BULLETPROOF PROGRAM FILTERING LOGIC
    is_m_pharm = True if "M" in program.upper() and "PHARM" in program.upper() else False
    
    # Fetch Subjects
    sub_stmt = select(Subject).where(Subject.semester == semester)
    if is_m_pharm:
        sub_stmt = sub_stmt.where(Subject.program.ilike("%M%Pharm%"))
    else:
        sub_stmt = sub_stmt.where(Subject.program.ilike("%B%Pharm%"))
    subjects = db.exec(sub_stmt).all()
    
    if not subjects:
        return {"subjects": [], "students": []}
        
    subject_dicts = [{"code": s.subject_code, "name": s.subject_name} for s in subjects]
    sub_codes = [s.subject_code for s in subjects]
    
    # Fetch Students using the same strict logic
    stu_stmt = select(Student).where(Student.semester == semester)
    if is_m_pharm:
        stu_stmt = stu_stmt.where(Student.program.ilike("%M%Pharm%"))
    else:
        stu_stmt = stu_stmt.where(Student.program.ilike("%B%Pharm%"))
    students = db.exec(stu_stmt).all()
    
    # 3. Fetch Attendance Records for these subjects
    records = db.exec(select(Attendance).where(Attendance.subject_id.in_(sub_codes))).all()
    
    # 4. Calculate total unique classes PER SUBJECT
    sub_sessions = {}
    for r in records:
        if r.subject_id not in sub_sessions:
            sub_sessions[r.subject_id] = set()
        seq = r.lecture_sequence if r.lecture_sequence is not None else 1
        sub_sessions[r.subject_id].add((r.date, seq))
        
    subject_total_classes = {sub: len(sessions) for sub, sessions in sub_sessions.items()}
    
    # 5. Calculate student attended classes PER SUBJECT
    student_attended = {}
    for r in records:
        if r.status and r.status.lower() == 'present':
            sid = r.student_id
            sub = r.subject_id
            if sid not in student_attended: student_attended[sid] = {}
            if sub not in student_attended[sid]: student_attended[sid][sub] = set()
            seq = r.lecture_sequence if r.lecture_sequence is not None else 1
            student_attended[sid][sub].add((r.date, seq))
            
    # 6. Format the output grid
    result_list = []
    for s in students:
        student_record = {"student_id": s.student_id, "name": s.full_name, "attendance": {}, "overall_percentage": 0}
        total_possible = 0
        total_attended = 0
        
        for sub in subjects:
            sub_code = sub.subject_code
            possible = subject_total_classes.get(sub_code, 0)
            attended_set = student_attended.get(s.student_id, {}).get(sub_code, set())
            attended = len(attended_set)
            
            total_possible += possible
            total_attended += attended
            
            perc = (attended / possible * 100) if possible > 0 else "-"
            student_record["attendance"][sub_code] = round(perc, 2) if possible > 0 else "-"
            
        student_record["overall_percentage"] = round((total_attended / total_possible * 100), 2) if total_possible > 0 else 0
        result_list.append(student_record)
        
    result_list.sort(key=lambda x: x["student_id"]) # Sort by Enrollment
    
    return {"program": program, "semester": semester, "subjects": subject_dicts, "students": result_list}

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