from sqlmodel import Session, select
from app.database import engine
from app.models import FacultyAllocation, Faculty, Subject

print("🔍 Inspecting Live Database Allocations...\n")

with Session(engine) as session:
    allocs = session.exec(select(FacultyAllocation)).all()
    print(f"Total Allocations in Database: {len(allocs)}")
    for a in allocs:
        print(f"  - Faculty ID: [{a.faculty_id}] -> Subject: [{a.subject_id}] (Batch: {a.batch_group})")
    
    print("\n-------------------------------------------")
    print("📋 Checking for broken mappings...")
    fac_ids = {f.faculty_id.strip() for f in session.exec(select(Faculty)).all()}
    sub_codes = {s.subject_code.strip().upper() for s in session.exec(select(Subject)).all()}
    
    for a in allocs:
        f_clean = a.faculty_id.strip()
        s_clean = a.subject_id.strip().upper()
        if f_clean not in fac_ids:
            print(f"  ❌ WARNING: Faculty ID '{a.faculty_id}' in allocations does NOT exist in the Faculty table!")
        if s_clean not in sub_codes:
            print(f"  ❌ WARNING: Subject Code '{a.subject_id}' in allocations does NOT exist in the Subjects table!")

print("\n✅ Inspection Complete.")