from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date
from enum import Enum

class ExamStatusEnum(str, Enum):
    DRAFT = "Draft"
    PUBLISHED = "Published"

class Student(SQLModel, table=True):
    student_id: str = Field(primary_key=True)
    full_name: str
    program: str
    specialization: Optional[str] = "General"
    semester: int
    batch_group: str

class Faculty(SQLModel, table=True):
    faculty_id: str = Field(primary_key=True)
    name: str
    email: str
    password: Optional[str] = "1234"

class Subject(SQLModel, table=True):
    subject_code: str = Field(primary_key=True)
    subject_name: str
    program: str
    specialization: Optional[str] = "General"
    semester: int
    lectures_per_week: int
    type: str

class FacultyAllocation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    faculty_id: str = Field(foreign_key="faculty.faculty_id")
    subject_id: str = Field(foreign_key="subject.subject_code")
    batch_group: str
    allocation_type: str

class Attendance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: str = Field(foreign_key="student.student_id")
    subject_id: str = Field(foreign_key="subject.subject_code")
    date: date
    status: str

class InternalExam(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    subject_id: str = Field(foreign_key="subject.subject_code")
    exam_name: str
    max_marks: float = 15.0
    status: ExamStatusEnum = ExamStatusEnum.DRAFT

class ExamMark(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    exam_id: int = Field(foreign_key="internalexam.id")
    student_id: str = Field(foreign_key="student.student_id")
    marks_obtained: Optional[float] = None
    is_absent: bool = False
    remarks: Optional[str] = None