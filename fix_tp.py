from sqlmodel import Session, select
from app.database import engine
from app.models import Attendance, Student

print("🔍 Analyzing 'TP' subjects to smartly segregate Theory and Practical...")

with Session(engine) as session:
    # 1. Get all attendance records that ended up in _THEORY but have 'TP' in their name
    records = session.exec(select(Attendance).where(Attendance.subject_id.contains("TP_THEORY"))).all()
    
    # 2. Group them by (Subject, Date, Lecture Number)
    sessions_map = {}
    for r in records:
        key = (r.subject_id, r.date, r.lecture_sequence)
        if key not in sessions_map:
            sessions_map[key] = []
        sessions_map[key].append(r)
        
    fixed_count = 0
    
    for key, session_records in sessions_map.items():
        subject_id, date, seq = key
        base_code = subject_id.replace("_THEORY", "") # e.g. BP502TP
        
        # 3. Find the batch groups of all students in this specific session
        student_ids = [r.student_id for r in session_records]
        students = session.exec(select(Student).where(Student.student_id.in_(student_ids))).all()
        
        # Extract unique batches, ignoring empty ones
        batches = set([s.batch_group.strip().upper() for s in students if s.batch_group])
        
        # 4. THE MAGIC LOGIC:
        # If all students present belong to EXACTLY ONE batch, it was a Practical!
        if len(batches) == 1 and list(batches)[0] != "ALL":
            new_subject_id = base_code + "_PRACTICAL"
            for r in session_records:
                r.subject_id = new_subject_id
                session.add(r)
            fixed_count += len(session_records)
            print(f"✔️ Moved {base_code} on {date} (Batch {list(batches)[0]}) -> PRACTICAL bucket")
        else:
            print(f"➖ Kept {base_code} on {date} (Multiple Batches: {batches}) -> THEORY bucket")
            
    session.commit()
    print(f"\n🎉 Successfully rescued {fixed_count} Practical attendance records!")