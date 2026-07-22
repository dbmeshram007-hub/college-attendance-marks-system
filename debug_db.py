# debug_db.py
from app.database import engine
from app.models import Student, FacultyAllocation
from sqlmodel import Session, select

with Session(engine) as session:
    print("--- 1. Faculty Allocations (Looking for Subject: BP301TP) ---")
    # Fetch everything so we can see what's actually there
    all_allocs = session.exec(select(FacultyAllocation)).all()
    for a in all_allocs:
        print(f"Found: Subject='{a.subject_id}', Batch='{a.batch_group}'")

    print("\n--- 2. Students (Looking for Batch Groups) ---")
    stus = session.exec(select(Student)).all()
    if not stus:
        print("No students found in DB!")
    else:
        # Show first 5 students to verify the data structure
        for s in stus[:5]:
            print(f"Student: {s.full_name}, Batch: '{s.batch_group}'")