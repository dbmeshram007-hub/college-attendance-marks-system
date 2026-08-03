from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from app.database import get_db
from app.models import Student, Attendance, Subject, InternalExam, ExamMark
import re

router = APIRouter(prefix="/api/reports", tags=["Reports"])

# ---------------------------------------------------------
# 1. COMPILED ATTENDANCE REPORT
# ---------------------------------------------------------
@router.get("/attendance/compiled")
def get_compiled_attendance(program: str, semester: int, db: Session = Depends(get_db)):
    # THE BUG FIX: Check if it STARTS with M, ignoring the M at the end of "B. Pharm"
    is_m_pharm = program.upper().strip().startswith("M")
    
    all_subjects = db.exec(select(Subject)).all()
    subjects = []
    for sub in all_subjects:
        code = (sub.subject_code or "").upper().strip()
        
        sem = 0
        try: sem = int(sub.semester) if sub.semester else 0
        except: pass
        
        if sem == 0:
            match = re.search(r'[A-Z]+(\d)\d{2}', code)
            if match: sem = int(match.group(1))
        
        sub_is_m = False
        sub_prog = (sub.program or "").upper().replace(" ", "")
        if sub_prog.startswith("M"): sub_is_m = True
        elif code.startswith("MP") or code.startswith("M."): sub_is_m = True
            
        if sem == semester and sub_is_m == is_m_pharm:
            subjects.append(sub)
            
    if not subjects:
        return {"program": program, "semester": semester, "subjects": [], "students": []}
        
    subject_dicts = [{"code": s.subject_code, "name": s.subject_name} for s in subjects]
    sub_codes = [s.subject_code for s in subjects]
    
    all_students = db.exec(select(Student)).all()
    students = []
    for stu in all_students:
        sem = 0
        try: sem = int(stu.semester) if stu.semester else 0
        except: pass
        
        stu_is_m = False
        stu_prog = (stu.program or "").upper().replace(" ", "")
        if stu_prog.startswith("M"): stu_is_m = True
            
        if sem == semester and stu_is_m == is_m_pharm:
            students.append(stu)
    
    records = db.exec(select(Attendance).where(Attendance.subject_id.in_(sub_codes))).all()
    
    sub_sessions = {}
    for r in records:
        if r.subject_id not in sub_sessions:
            sub_sessions[r.subject_id] = set()
        seq = r.lecture_sequence if r.lecture_sequence is not None else 1
        sub_sessions[r.subject_id].add((r.date, seq))
        
    subject_total_classes = {sub: len(sessions) for sub, sessions in sub_sessions.items()}
    
    student_attended = {}
    for r in records:
        if r.status and r.status.lower() == 'present':
            sid = r.student_id
            sub = r.subject_id
            if sid not in student_attended: student_attended[sid] = {}
            if sub not in student_attended[sid]: student_attended[sid][sub] = set()
            seq = r.lecture_sequence if r.lecture_sequence is not None else 1
            student_attended[sid][sub].add((r.date, seq))
            
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
        
    result_list.sort(key=lambda x: x["student_id"])
    return {"program": program, "semester": semester, "subjects": subject_dicts, "students": result_list}

# ---------------------------------------------------------
# 2. COMPILED MARKS REPORT
# ---------------------------------------------------------
@router.get("/marks/compiled")
def get_compiled_marks(program: str, semester: int, exam_name: str, db: Session = Depends(get_db)):
    is_m_pharm = program.upper().strip().startswith("M")
    
    all_subjects = db.exec(select(Subject)).all()
    subjects = []
    for sub in all_subjects:
        code = (sub.subject_code or "").upper().strip()
        
        sem = 0
        try: sem = int(sub.semester) if sub.semester else 0
        except: pass
        
        if sem == 0:
            match = re.search(r'[A-Z]+(\d)\d{2}', code)
            if match: sem = int(match.group(1))
        
        sub_is_m = False
        sub_prog = (sub.program or "").upper().replace(" ", "")
        if sub_prog.startswith("M"): sub_is_m = True
        elif code.startswith("MP") or code.startswith("M."): sub_is_m = True
            
        if sem == semester and sub_is_m == is_m_pharm:
            subjects.append(sub)
            
    if not subjects:
        return {"program": program, "semester": semester, "examName": exam_name, "subjects": [], "students": []}
    
    subject_dicts = [{"code": s.subject_code, "name": s.subject_name} for s in subjects]
    sub_codes = [s.subject_code for s in subjects]
    
    all_students = db.exec(select(Student)).all()
    students = []
    for stu in all_students:
        sem = 0
        try: sem = int(stu.semester) if stu.semester else 0
        except: pass
        
        stu_is_m = False
        stu_prog = (stu.program or "").upper().replace(" ", "")
        if stu_prog.startswith("M"): stu_is_m = True
            
        if sem == semester and stu_is_m == is_m_pharm:
            students.append(stu)
    
    exams = db.exec(select(InternalExam).where(InternalExam.subject_id.in_(sub_codes), InternalExam.exam_name == exam_name)).all()
    exam_map = {e.subject_id: e.id for e in exams}
    
    marks = []
    if exam_map:
        marks = db.exec(select(ExamMark).where(ExamMark.exam_id.in_(exam_map.values()))).all()
        
    student_marks = {}
    for m in marks:
        if m.student_id not in student_marks: student_marks[m.student_id] = {}
        student_marks[m.student_id][m.exam_id] = m
        
    result = []
    for s in students:
        s_record = {"student_id": s.student_id, "name": s.full_name, "marks": {}, "total": 0}
        for sub in subjects:
            exam_id = exam_map.get(sub.subject_code)
            if not exam_id:
                s_record["marks"][sub.subject_code] = "-"
                continue
            
            m = student_marks.get(s.student_id, {}).get(exam_id)
            if m:
                if m.is_absent:
                    s_record["marks"][sub.subject_code] = "ABS"
                elif m.marks_obtained is not None:
                    s_record["marks"][sub.subject_code] = m.marks_obtained
                    s_record["total"] += m.marks_obtained
                else:
                    s_record["marks"][sub.subject_code] = "-"
            else:
                s_record["marks"][sub.subject_code] = "-"
        result.append(s_record)
        
    result.sort(key=lambda x: x["total"], reverse=True)
    return {"program": program, "semester": semester, "examName": exam_name, "subjects": subject_dicts, "students": result}

# ---------------------------------------------------------
# 3. SINGLE SUBJECT ATTENDANCE REPORT
# ---------------------------------------------------------
@router.get("/attendance/{subject_id}")
def get_attendance_report(subject_id: str, db: Session = Depends(get_db)):
    search_code = subject_id.strip().upper()
    subject = db.get(Subject, search_code)
    
    if not subject:
        clean_code = re.sub(r'[^A-Z0-9]', '', search_code)
        match = re.search(r'([A-Z]+)(\d{3})', clean_code)
        if match:
            alpha = match.group(1)
            num = match.group(2)
            subject = db.exec(select(Subject).where(Subject.subject_code.ilike(f"%{alpha}%{num}%"))).first()
            
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found in database")
    
    records = db.exec(select(Attendance).where(Attendance.subject_id == subject.subject_code)).all()
    sessions = set([(r.date, r.lecture_sequence if r.lecture_sequence is not None else 1) for r in records])
    total_classes = len(sessions)
    
    if total_classes == 0:
        return {"subject": subject.subject_name, "total_classes": 0, "students": []}
        
    student_attended_sessions = {}
    for r in records:
        key = r.student_id
        if key not in student_attended_sessions:
            student_attended_sessions[key] = set()
        if r.status and r.status.lower() == "present":
            seq = r.lecture_sequence if r.lecture_sequence is not None else 1
            student_attended_sessions[key].add((r.date, seq))

    # Safely extract target semester and program type
    target_semester = 0
    try: target_semester = int(subject.semester) if subject.semester else 0
    except: pass
    
    if target_semester == 0:
        match = re.search(r'[A-Z]+(\d)\d{2}', subject.subject_code.upper())
        if match: target_semester = int(match.group(1))

    is_m_pharm = False
    sub_prog = (subject.program or "").upper().replace(" ", "")
    if sub_prog.startswith("M"): is_m_pharm = True
    elif search_code.startswith("MP") or search_code.startswith("M."): is_m_pharm = True
            
    all_students = db.exec(select(Student)).all()
    students = []
    for stu in all_students:
        sem = 0
        try: sem = int(stu.semester) if stu.semester else 0
        except: pass
        
        stu_is_m = False
        stu_prog = (stu.program or "").upper().replace(" ", "")
        if stu_prog.startswith("M"): stu_is_m = True
            
        if sem == target_semester and stu_is_m == is_m_pharm:
            students.append(stu)

    result = []
    for s in students:
        attended = len(student_attended_sessions.get(s.student_id, set()))
        perc = (attended / total_classes) * 100 if total_classes > 0 else 0
        
        result.append({
            "student_id": s.student_id,
            "name": s.full_name,
            "attended": attended,
            "percentage": round(min(perc, 100), 2)
        })
        
    return {
        "subject": subject.subject_name, 
        "total_classes": total_classes, 
        "students": sorted(result, key=lambda x: x['name'])
    }