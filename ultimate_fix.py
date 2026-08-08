from sqlmodel import Session, select
from app.database import engine
from app.models import Attendance, Student
import collections

print("🚀 Running the ULTIMATE Theory/Practical Segregation Script...")

with Session(engine) as session:
    # 1. Fetch all students to quickly look up their batch
    all_students = session.exec(select(Student)).all()
    student_batch_map = {s.student_id: s.batch_group.strip().upper() for s in all_students if s.batch_group}
    
    # 2. Fetch all attendance records in the entire database
    all_attendance = session.exec(select(Attendance)).all()
    
    # Group by a normalized base code (e.g., BP502TP_THEORY -> BP502TP, BP502TP -> BP502TP)
    # + date + lecture_seq
    sessions = collections.defaultdict(list)
    for att in all_attendance:
        base_code = att.subject_id.replace("_THEORY", "").replace("_PRACTICAL", "").strip().upper()
        key = (base_code, att.date, att.lecture_sequence)
        sessions[key].append(att)
        
    updated_count = 0
    
    for key, records in sessions.items():
        base_code, date, seq = key
        
        # Find the batches for these specific students
        batches_in_session = set()
        for r in records:
            batch = student_batch_map.get(r.student_id)
            if batch and batch != "ALL":
                batches_in_session.add(batch)
        
        # THE MAGIC LOGIC:
        # If the frontend fetched a specific batch, all records will only have students from that batch (len == 1)
        # If it fetched "All Batches", records will have students from multiple batches (len > 1)
        is_practical = False
        if len(batches_in_session) == 1:
            is_practical = True
        elif len(batches_in_session) > 1:
            is_practical = False
            
        # Hardcode absolute rules for pure Theory or pure Practical subjects to be safe
        if base_code.endswith("PP") or base_code.endswith("PRACTICAL") or (base_code.endswith("P") and not base_code.endswith("TP")):
            is_practical = True
        elif base_code.endswith("TT") or base_code.endswith("THEORY"):
            is_practical = False

        # Assign the correct suffix
        correct_suffix = "_PRACTICAL" if is_practical else "_THEORY"
        new_subject_id = base_code + correct_suffix
        
        # Apply the update to the database
        for r in records:
            if r.subject_id != new_subject_id:
                r.subject_id = new_subject_id
                session.add(r)
                updated_count += 1
                
    session.commit()
    print(f"✅ Successfully analyzed and segregated {updated_count} attendance records!")
    print("🎉 Your Practical attendance is now securely in the _PRACTICAL bucket!")