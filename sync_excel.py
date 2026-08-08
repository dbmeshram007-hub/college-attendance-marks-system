import pandas as pd
from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models import Student, Faculty, Subject, FacultyAllocation, Attendance, ExamMark

print("🔄 Starting Password-Safe Sync with Excel Data...")

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
# 1. SYNC FACULTY (WITH PASSWORD PRESERVATION)
# ==========================================
if 'Faculty' in xls.sheet_names:
    df_faculty = pd.read_excel(xls, sheet_name='Faculty')
    df_faculty.columns = df_faculty.columns.str.strip()
    
    for _, row in df_faculty.iterrows():
        fac_id = str(row['faculty_id']).strip()
        
        # Check if faculty already exists in DB to keep their custom password
        existing_fac = session.get(Faculty, fac_id)
        current_password = existing_fac.password if (existing_fac and existing_fac.password) else "1234"
        
        faculty = Faculty(
            faculty_id=fac_id,
            name=str(row['name']).strip(),
            email=str(row['email']).strip(),
            password=current_password # PRESERVES custom passwords!
        )
        session.merge(faculty)
    session.commit()
    print("   -> Faculty safely synced (passwords preserved).")

# ==========================================
# 2. SYNC STUDENTS (WITH REMOVAL SYNC)
# ==========================================
if 'Students' in xls.sheet_names:
    df_students = pd.read_excel(xls, sheet_name='Students')
    df_students.columns = df_students.columns.str.strip().str.lower()
    
    excel_student_ids = set()
    for _, row in df_students.iterrows():
        stu_id = str(row.get('student_id', '')).strip()
        if not stu_id or stu_id.lower() == 'nan':
            continue
        excel_student_ids.add(stu_id)
        
        sem_val = row.get('semester', row.get('current_semester', row.get('sem', 1)))
        student = Student(
            student_id=stu_id,
            full_name=str(row.get('full_name', row.get('name', ''))).strip(),
            program=str(row.get('program', '')).strip(),
            specialization=str(row.get('specialization', 'General')).strip(),
            semester=int(sem_val) if pd.notna(sem_val) else 1,
            batch_group=str(row.get('batch_group', row.get('batch', ''))).strip()
        )
        session.merge(student)
    session.commit()
    
    db_students = session.query(Student).all()
    for db_stu in db_students:
        if db_stu.student_id not in excel_student_ids:
            session.query(Attendance).filter(Attendance.student_id == db_stu.student_id).delete()
            session.query(ExamMark).filter(ExamMark.student_id == db_stu.student_id).delete()
            session.delete(db_stu)
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
# 4. SYNC ALLOCATIONS (CLEAN NO-DUPLICATE MATCHING)
# ==========================================
if 'Faculty_Allocation' in xls.sheet_names:
    df_alloc = pd.read_excel(xls, sheet_name='Faculty_Allocation')
    df_alloc.columns = df_alloc.columns.str.strip() 
    
    session.query(FacultyAllocation).delete()
    session.commit()
    
    all_valid_subjects = {s.subject_code for s in session.query(Subject).all()}
    
    for _, row in df_alloc.iterrows():
        raw_fac_ids = str(row['faculty_id']).split(',')
        raw_sub_id = str(row['subject_id']).strip().upper()
        batch_grp = str(row.get('batch_group', 'All')).strip()
        alloc_type = str(row.get('allocation_type', 'Theory')).strip()
        
        matched_subjects = []
        suffixed_variants = [v for v in all_valid_subjects if v.startswith(raw_sub_id + "_") or v.startswith(raw_sub_id + "-")]
        
        if suffixed_variants:
            matched_subjects.extend(suffixed_variants)
        elif raw_sub_id in all_valid_subjects:
            matched_subjects.append(raw_sub_id)
        else:
            for valid_sub in all_valid_subjects:
                if raw_sub_id in valid_sub:
                    matched_subjects.append(valid_sub)
                    
        if not matched_subjects:
            matched_subjects.append(raw_sub_id)

        for fac_id in raw_fac_ids:
            fac_id = fac_id.strip()
            if not fac_id or fac_id.lower() == 'nan':
                continue
                
            for sub_id in matched_subjects:
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

    print("   -> Faculty Allocations synced cleanly.")

print("🎉 Database Sync Complete! Faculty passwords are now safely preserved.")