import pandas as pd
from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models import Student, Faculty, Subject, FacultyAllocation

print("🔄 Starting LIGHTNING SAFE Sync with Excel Data...")

# 1. Connect to the database
Session = sessionmaker(bind=engine)
session = Session()

file_path = 'College_System_Seed_Data.xlsx'

try:
    xls = pd.ExcelFile(file_path)
    print(f"✅ Found '{file_path}'. Syncing data...")
except FileNotFoundError:
    print(f"❌ ERROR: Could not find '{file_path}'. Make sure it is in the same folder.")
    exit(1)

# Helper function to safely convert strings to numbers
def safe_int(val, default=0):
    try:
        if pd.isna(val) or str(val).strip().lower() == 'nan': return default
        return int(float(str(val).strip()))
    except:
        return default

# Helper function to completely strip decimals from numbers (fixes the "12345.0" issue)
def clean_str(val):
    if pd.isna(val) or str(val).strip().lower() == 'nan': return ""
    v = str(val).strip()
    if v.endswith('.0'): 
        v = v[:-2] # Removes the .0
    return v

# ==========================================
# SYNC FACULTY
# ==========================================
if 'Faculty' in xls.sheet_names:
    df_faculty = pd.read_excel(xls, sheet_name='Faculty', dtype=str)
    df_faculty.columns = df_faculty.columns.str.strip()
    
    try:
        for _, row in df_faculty.iterrows():
            fac_id = clean_str(row.get('faculty_id', ''))
            if not fac_id: continue
            
            faculty = Faculty(
                faculty_id=fac_id,
                name=clean_str(row.get('name', '')),
                email=clean_str(row.get('email', ''))
            )
            session.merge(faculty)
        session.commit()
        print("   ⚡ Faculty synced in FAST mode.")
    except Exception as e:
        session.rollback()
        print("   ⚠️ Bulk sync failed. Switching to Safe Row-by-Row Mode...")
        for _, row in df_faculty.iterrows():
            try:
                fac_id = clean_str(row.get('faculty_id', ''))
                if not fac_id: continue
                faculty = Faculty(faculty_id=fac_id, name=clean_str(row.get('name', '')), email=clean_str(row.get('email', '')))
                session.merge(faculty)
                session.commit()
            except Exception as row_e:
                session.rollback()
                print(f"      -> Skipping invalid faculty row ({row.get('faculty_id')}): {row_e}")

# ==========================================
# SYNC STUDENTS
# ==========================================
if 'Students' in xls.sheet_names:
    df_students = pd.read_excel(xls, sheet_name='Students', dtype=str)
    df_students.columns = df_students.columns.str.strip().str.lower()
    
    try:
        for _, row in df_students.iterrows():
            student_id_str = clean_str(row.get('student_id', ''))
            if not student_id_str: continue

            sem_val = row.get('semester', row.get('current_semester', row.get('sem', row.get('current_se', 1))))
            student = Student(
                student_id=student_id_str,
                full_name=clean_str(row.get('full_name', row.get('name', ''))),
                program=clean_str(row.get('program', '')),
                specialization=clean_str(row.get('specialization', 'General')) or 'General',
                semester=safe_int(sem_val, 1),
                batch_group=clean_str(row.get('batch_group', row.get('batch', '')))
            )
            session.merge(student)
        session.commit()
        print("   ⚡ Students synced in FAST mode.")
    except Exception as e:
        session.rollback()
        print("   ⚠️ Bulk sync failed. Switching to Safe Row-by-Row Mode...")
        for _, row in df_students.iterrows():
            try:
                student_id_str = clean_str(row.get('student_id', ''))
                if not student_id_str: continue
                sem_val = row.get('semester', row.get('current_semester', row.get('sem', row.get('current_se', 1))))
                student = Student(student_id=student_id_str, full_name=clean_str(row.get('full_name', row.get('name', ''))), program=clean_str(row.get('program', '')), specialization=clean_str(row.get('specialization', 'General')) or 'General', semester=safe_int(sem_val, 1), batch_group=clean_str(row.get('batch_group', row.get('batch', ''))))
                session.merge(student)
                session.commit()
            except Exception as row_e:
                session.rollback()
                print(f"      -> Skipping invalid student row ({row.get('student_id')}): {row_e}")

# ==========================================
# SYNC SUBJECTS
# ==========================================
if 'Subjects' in xls.sheet_names:
    df_subjects = pd.read_excel(xls, sheet_name='Subjects', dtype=str)
    df_subjects.columns = df_subjects.columns.str.strip()
    
    try:
        for _, row in df_subjects.iterrows():
            sub_code = clean_str(row.get('subject_code', '')).upper()
            if not sub_code: continue
            
            subject = Subject(
                subject_code=sub_code,
                subject_name=clean_str(row.get('subject_name', '')),
                program=clean_str(row.get('program', '')),
                specialization=clean_str(row.get('specialization', 'General')) or 'General',
                semester=safe_int(row.get('semester'), 0),
                lectures_per_week=safe_int(row.get('lectures_per_week'), 0),
                type=clean_str(row.get('type', ''))
            )
            session.merge(subject)
        session.commit()
        print("   ⚡ Subjects synced in FAST mode.")
    except Exception as e:
        session.rollback()
        print("   ⚠️ Bulk sync failed. Switching to Safe Row-by-Row Mode...")
        for _, row in df_subjects.iterrows():
            try:
                sub_code = clean_str(row.get('subject_code', '')).upper()
                if not sub_code: continue
                subject = Subject(subject_code=sub_code, subject_name=clean_str(row.get('subject_name', '')), program=clean_str(row.get('program', '')), specialization=clean_str(row.get('specialization', 'General')) or 'General', semester=safe_int(row.get('semester'), 0), lectures_per_week=safe_int(row.get('lectures_per_week'), 0), type=clean_str(row.get('type', '')))
                session.merge(subject)
                session.commit()
            except Exception as row_e:
                session.rollback()
                print(f"      -> Skipping invalid subject row ({row.get('subject_code')}): {row_e}")

# ==========================================
# SYNC FACULTY ALLOCATIONS
# ==========================================
if 'Faculty_Allocation' in xls.sheet_names:
    df_alloc = pd.read_excel(xls, sheet_name='Faculty_Allocation', dtype=str)
    df_alloc.columns = df_alloc.columns.str.strip() 
    
    try:
        session.query(FacultyAllocation).delete()
        session.commit()
    except Exception:
        session.rollback()
    
    for _, row in df_alloc.iterrows():
        raw_fac_ids = clean_str(row.get('faculty_id', '')).split(',')
        base_sub_id = clean_str(row.get('subject_id', '')).upper()
        batch_grp = clean_str(row.get('batch_group', 'All')) or 'All'
        alloc_type = clean_str(row.get('allocation_type', 'Theory')) or 'Theory'
        
        # SMART SUFFIX LOGIC: Automatically create _THEORY or _PRACTICAL
        suffix = "_PRACTICAL" if "PRACTICAL" in alloc_type.upper() else "_THEORY"
        suffixed_sub_id = f"{base_sub_id}{suffix}"
        
        for fac_id in raw_fac_ids:
            fac_id = fac_id.strip()
            if not fac_id: continue
                
            # Auto-create the suffixed subject in the database if it doesn't exist
            existing_sub = session.query(Subject).filter_by(subject_code=suffixed_sub_id).first()
            if not existing_sub:
                base_sub = session.query(Subject).filter_by(subject_code=base_sub_id).first()
                if base_sub:
                    new_sub = Subject(
                        subject_code=suffixed_sub_id,
                        subject_name=f"{base_sub.subject_name} ({alloc_type.capitalize()})",
                        program=base_sub.program,
                        specialization=base_sub.specialization,
                        semester=base_sub.semester,
                        lectures_per_week=base_sub.lectures_per_week,
                        type=alloc_type.capitalize()
                    )
                    session.add(new_sub)
                    session.commit()
                else:
                    print(f"   ⚠️ Skipping: Base subject '{base_sub_id}' is missing from Subjects sheet.")
                    continue
                
            alloc = FacultyAllocation(
                faculty_id=fac_id,
                subject_id=suffixed_sub_id,
                batch_group=batch_grp,
                allocation_type=alloc_type.capitalize()
            )
            session.add(alloc)
            
            try:
                session.commit()
            except Exception as e:
                session.rollback()
                print(f"   ⚠️ Skipping allocation: Subject '{suffixed_sub_id}' -> Faculty '{fac_id}'.")
                print(f"      Reason: Check your Excel. Either Faculty '{fac_id}' is missing from the 'Faculty' tab, OR Subject '{base_sub_id}' is missing from the 'Subjects' tab.")

    print("   ⚡ Faculty Allocations synced.")

print("🎉 Lightning Database Sync Complete! Your marks and attendance data is untouched.")