from sqlmodel import Session, select
from app.database import engine
from app.models import Attendance, InternalExam

print("🚑 Reconnecting your previous data...")

with Session(engine) as session:
    # 1. Recover Attendance
    attendances = session.exec(select(Attendance)).all()
    recovered_att = 0
    for att in attendances:
        if "_" not in att.subject_id: # Only update old records
            if "PP" in att.subject_id:
                att.subject_id = att.subject_id + "_PRACTICAL"
            elif "TT" in att.subject_id:
                att.subject_id = att.subject_id + "_THEORY"
            else:
                # If it's a mixed code like BP701TP, default to Theory so it reappears
                att.subject_id = att.subject_id + "_THEORY"
            session.add(att)
            recovered_att += 1
            
    # 2. Recover Exams
    exams = session.exec(select(InternalExam)).all()
    recovered_exam = 0
    for exam in exams:
        if "_" not in exam.subject_id: # Only update old records
            if "Practical" in exam.exam_name:
                exam.subject_id = exam.subject_id + "_PRACTICAL"
            elif "PP" in exam.subject_id:
                exam.subject_id = exam.subject_id + "_PRACTICAL"
            else:
                exam.subject_id = exam.subject_id + "_THEORY"
            session.add(exam)
            recovered_exam += 1
            
    session.commit()
    print(f"✅ Successfully reconnected {recovered_att} attendance records!")
    print(f"✅ Successfully reconnected {recovered_exam} exam records!")