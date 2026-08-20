from sqlmodel import Session, select
from app.database import engine
from app.models import Faculty, FacultyAllocation

print("🧹 Starting Database Cleanup...")

with Session(engine) as session:
    # Get everyone
    all_faculty = session.exec(select(Faculty)).all()
    allocations = session.exec(select(FacultyAllocation)).all()
    
    # Make a list of IDs that actually have subjects assigned
    allocated_ids = {a.faculty_id for a in allocations}
    
    deleted_count = 0
    for f in all_faculty:
        # If they have NO subjects and are not the ADMIN...
        if f.faculty_id not in allocated_ids and f.faculty_id != "ADMIN":
            try:
                session.delete(f)
                session.commit()
                deleted_count += 1
                print(f"🗑️ Deleted empty ghost faculty: {f.faculty_id} - {f.name}")
            except Exception as e:
                session.rollback()
                print(f"⚠️ Could not delete {f.faculty_id}. They might have old attendance records attached.")
                
    print(f"✅ Cleanup complete! Removed {deleted_count} empty duplicate faculty.")