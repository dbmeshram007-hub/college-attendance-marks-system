from sqlmodel import create_engine, Session

# Make sure this has your correct password and port 5433
DATABASE_URL=DIRECT_URL="postgresql://postgres.rtjeaobxcwgjzeupzcni:Ayyappa%*563@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

engine = create_engine(DATABASE_URL, echo=True)
def get_db():
    with Session(engine) as session:
        yield session