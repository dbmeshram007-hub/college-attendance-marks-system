from sqlmodel import create_engine, Session

# Make sure this has your correct password and port 5433
DATABASE_URL = "postgresql://postgres:password@localhost:5433/college_db"

engine = create_engine(DATABASE_URL, echo=True)
def get_db():
    with Session(engine) as session:
        yield session