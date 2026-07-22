import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models import Student, Faculty, Subject, FacultyAllocation, SQLModel

# ==========================================
# ==========================================
print("1. Wiping the database completely clean...")
with engine.connect() as conn:
    conn.execute(text("DROP SCHEMA public CASCADE;"))
    conn.execute(text("CREATE SCHEMA public;"))
    conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
    conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
    conn.commit()

# ==========================================
# ==========================================
print("2. Creating fresh tables based on app/models.py...")
SQLModel.metadata.create_all(engine)

# ==========================================
# ==========================================
Session = sessionmaker(bind=engine)
session = Session()

file_path = 'College_System_Seed_Data.xlsx'
print(f"3. Loading data from {file_path}...")

# THIS IS THE LINE THAT WAS MISSING! It opens the Excel file.
try:
    xls = pd.ExcelFile(file_path)
except FileNotFoundError:
    print(f"❌ ERROR: Could not find '{file_path}'. Make sure it is in the same folder.")
    exit(1)

# ==========================================
# ==========================================
if 'Faculty' in xls.sheet_names:
    df_faculty = pd.read_excel(xls, sheet_name='Faculty')
    df_faculty.columns = df_faculty.columns.str.strip() # Fixes invisible spaces
    for _, row in df_faculty.iterrows():
        faculty = Faculty(
            faculty_id=str(row['faculty_id']).strip(),
            name=str(row['name']).strip(),
            email=str(row['email']).strip()
        )
        session.merge(faculty)
    print("   -> Faculty loaded.")

# ==========================================
# ==========================================
if 'Students' in xls.sheet_names:
    df_students = pd.read_excel(xls, sheet_name='Students')
    # Convert all column names to lowercase to fix case-sensitivity (e.g., 'Semester' vs 'semester')
    df_students.columns = df_students.columns.str.strip().str.lower()
    
    for _, row in df_students.iterrows():
        # Safely check for various ways "semester" might be spelled in Excel
        sem_val = row.get('semester', row.get('current_semester', row.get('sem', row.get('current_se', 1))))
        
        student = Student(
            student_id=str(row.get('student_id', '')).strip(),
            full_name=str(row.get('full_name', row.get('name', ''))).strip(),
            program=str(row.get('program', '')).strip(),
            specialization=str(row.get('specialization', 'General')).strip(),
            semester=int(sem_val) if pd.notna(sem_val) else 1,
            batch_group=str(row.get('batch_group', row.get('batch', ''))).strip()
        )
        session.merge(student)
    print("   -> Students loaded.")

# ==========================================
# ==========================================
if 'Subjects' in xls.sheet_names:
    df_subjects = pd.read_excel(xls, sheet_name='Subjects')
    df_subjects.columns = df_subjects.columns.str.strip()
    for _, row in df_subjects.iterrows():
        subject = Subject(
            subject_code=str(row['subject_code']).strip(),
            subject_name=str(row['subject_name']).strip(),
            program=str(row['program']).strip(),
            specialization=str(row['specialization']).strip(),
            # Safely handle empty cells by defaulting to 0
            semester=int(row['semester']) if pd.notna(row['semester']) else 0,
            lectures_per_week=int(row['lectures_per_week']) if pd.notna(row['lectures_per_week']) else 0,
            type=str(row['type']).strip()
        )
        session.merge(subject)
    print("   -> Subjects loaded.")

# ==========================================
# ==========================================
if 'Faculty_Allocation' in xls.sheet_names:
    df_alloc = pd.read_excel(xls, sheet_name='Faculty_Allocation')
    df_alloc.columns = df_alloc.columns.str.strip() 
    
    # Commit all students and subjects first so the database is ready
    session.commit()
    
    for _, row in df_alloc.iterrows():
        fac_id = str(row['faculty_id']).strip()
        sub_id = str(row['subject_id']).strip()
        
        alloc = FacultyAllocation(
            faculty_id=fac_id,
            subject_id=sub_id,
            batch_group=str(row['batch_group']).strip(),
            allocation_type=str(row['allocation_type']).strip()
        )
        
        try:
            # Attempt to save just this single allocation
            session.merge(alloc)
            session.commit()
        except Exception as e:
            # If the database rejects it (missing faculty or subject), undo and skip!
            session.rollback()
            print(f"   ⚠️ Skipping bad allocation: Faculty '{fac_id}' + Subject '{sub_id}'")

    print("   -> Faculty Allocations loaded.")

print("🎉 Database seeded successfully!")