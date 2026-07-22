from app.database import engine
from sqlmodel import SQLModel

print("Dropping all tables from college_db...")
# This deletes all tables defined in your models
SQLModel.metadata.drop_all(engine)
print("Tables dropped. Database is now clean!")