import pandas as pd
from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models import Student, Faculty, Subject, FacultyAllocation

print("🔄 Starting SAFE Sync with Excel Data...")

Session = sessionmaker(bind=engine)
session = Session()

file_path = 'College_System_Seed_Data.xlsx'

try:
    xls = pd.ExcelFile(file_path)
    print(f"✅ Found '{file_path}'. Syncing data...")
except FileNotFoundError:
    print(f"❌ ERROR: Could not find '{file_path}'. Make sure it is in the same folder.")
    exit(1)

# ==========================================
# 1. SYNC FACULTY
# ==========================================
if 'Faculty' in xls.sheet_names:
    df_faculty = pd.read_excel(xls, sheet_name='Faculty')
    df_faculty.columns = df_faculty.columns.str.strip()
    
    for _, row in df_faculty.iterrows():
        faculty = Faculty(
            faculty_id=str(row['faculty_id']).strip(),
            name=str(row['name']).strip(),
            email=str(row['email']).strip()
        )
        session.merge(faculty)
    session.commit()
    print("   -> Faculty safely synced.")

# ==========================================
# 2. SYNC STUDENTS
# ==========================================
if 'Students' in xls.sheet_names:
    df_students = pd.read_excel(xls, sheet_name='Students')
    df_students.columns = df_students.columns.str.strip().str.lower()
    
    for _, row in df_students.iterrows():
        sem_val = row.get('semester', row.get('current_semester', row.get('sem', row.get('current_se', 1))))
        
        student = Student(
            student_id=str(row.get('student_id', '')).strip(),
            full_name=str(row.get('full_name', row.get('name', ''))).strip(),
            program=str(row.get('program', '')).strip(),
            specialization=str(row.get('specialization', 'General')).strip(),
            semester=int(sem_val) if pd.notna(sem_val) else 1,
            batch_group=str(row.get('batch_group', row.get('batch', ''))).strip().replace('Batch_', '')
        )
        session.merge(student)
    session.commit()
    print("   -> Students safely synced.")

# ==========================================
# 3. SYNC SUBJECTS
# ==========================================
if 'Subjects' in xls.sheet_names:
    df_subjects = pd.read_excel(xls, sheet_name='Subjects')
    df_subjects.columns = df_subjects.columns.str.strip()
    for _, row in df_subjects.iterrows():
        subject = Subject(
            subject_code=str(row['subject_code']).strip().upper(),
            subject_name=str(row['subject_name']).strip(),
            program=str(row['program']).strip(),
            specialization=str(row['specialization']).strip(),
            semester=int(row['semester']) if pd.notna(row['semester']) else 0,
            lectures_per_week=int(row['lectures_per_week']) if pd.notna(row['lectures_per_week']) else 0,
            type=str(row['type']).strip()
        )
        session.merge(subject)
    session.commit()
    print("   -> Subjects safely synced.")

# ==========================================
# 4. SYNC FACULTY ALLOCATIONS (Smart Batch Normalization)
# ==========================================
if 'Faculty_Allocation' in xls.sheet_names:
    df_alloc = pd.read_excel(xls, sheet_name='Faculty_Allocation')
    df_alloc.columns = df_alloc.columns.str.strip() 
    
    # Clear old allocations to prevent duplicates
    session.query(FacultyAllocation).delete()
    session.commit()
    
    for _, row in df_alloc.iterrows():
        raw_fac_ids = str(row['faculty_id']).split(',')
        sub_id = str(row['subject_id']).strip().upper()
        
        # Normalize batch group (e.g. "Batch_A" -> "A", "ALL" -> "All")
        raw_batch = str(row.get('batch_group', 'All')).strip()
        if raw_batch.upper() == 'ALL':
            batch_grp = 'All'
        else:
            batch_grp = raw_batch.replace('Batch_', '').replace('batch_', '')

        alloc_type = str(row.get('allocation_type', 'Theory')).strip()
        
        for fac_id in raw_fac_ids:
            fac_id = fac_id.strip()
            if not fac_id or fac_id.lower() == 'nan':
                continue
                
            alloc = FacultyAllocation(
                faculty_id=fac_id,
                subject_id=sub_id,
                batch_group=batch_grp,
                allocation_type=alloc_type
            )
            session.add(alloc)
            
            try:
                session.commit()
            except Exception as e:
                session.rollback()
                print(f"   ⚠️ Skipping invalid allocation: Could not map '{sub_id}' to Faculty '{fac_id}'.")

    print("   -> Faculty Allocations safely synced.")

print("🎉 Database Sync Complete! Your marks and attendance data is untouched.")
