from sqlmodel import Session, select
from app.database import engine
from app.models import Subject

print("🧹 Cleaning up old Ghost Subjects...")
with Session(engine) as session:
    subjects = session.exec(select(Subject)).all()
    deleted = 0
    for sub in subjects:
        if "_" not in sub.subject_code:
            session.delete(sub)
            deleted += 1
    session.commit()
    print(f"✅ Deleted {deleted} old subjects. Dropdowns are now clean!")