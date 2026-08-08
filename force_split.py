from sqlmodel import Session, select
from app.database import engine
from app.models import Attendance
import collections

print("🛠️ Surgically separating Theory and Practical based on Class Size...")

with Session(engine) as session:
    all_att = session.exec(select(Attendance)).all()
    
    # Group by Base Subject + Date + Seq
    sessions = collections.defaultdict(list)
    for att in all_att:
        base = att.subject_id.replace("_THEORY", "").replace("_PRACTICAL", "").strip()
        sessions[(base, att.date, att.lecture_sequence)].append(att)
        
    moved_to_prac = 0
    moved_to_theory = 0
        
    for key, records in sessions.items():
        base_code, date, seq = key
        
        # Count how many students were marked in this specific grid
        student_count = len(records)
        
        # MAGIC HEURISTIC: Practicals are batches (< 40 students). Theory is whole class (>= 40).
        if base_code.endswith("PP") or "PRACTICAL" in base_code:
            is_practical = True
        elif base_code.endswith("TT") or "THEORY" in base_code:
            is_practical = False
        else:
            if student_count < 40:
                is_practical = True
            else:
                is_practical = False
                
        correct_suffix = "_PRACTICAL" if is_practical else "_THEORY"
        correct_id = base_code + correct_suffix
        
        for r in records:
            if r.subject_id != correct_id:
                r.subject_id = correct_id
                session.add(r)
                if is_practical:
                    moved_to_prac += 1
                else:
                    moved_to_theory += 1
                    
    session.commit()
    print(f"✅ Moved {moved_to_prac} records to PRACTICAL buckets")
    print(f"✅ Moved {moved_to_theory} records to THEORY buckets")


