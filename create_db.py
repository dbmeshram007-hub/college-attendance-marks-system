import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# ==========================================
# ENTER YOUR PASSWORD HERE
# ==========================================
# Replace this with the password you created when installing PostgreSQL
DB_PASSWORD = "my_secret_password123"

try:
    print("Connecting to PostgreSQL server...")
    
    # We connect to the default 'postgres' database just to get our foot in the door
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="password",
        host="127.0.0.1",
        port="5433"
    )
    
    # We must turn on autocommit to run a CREATE DATABASE command
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    print("Creating college_db...")
    cursor.execute("CREATE DATABASE college_db;")
    
    print("✅ Success! The database 'college_db' has been created.")
    
    cursor.close()
    conn.close()

except psycopg2.errors.DuplicateDatabase:
    print("✅ Database 'college_db' already exists! You are good to go.")
except psycopg2.OperationalError:
    print("❌ ERROR: Could not connect to PostgreSQL. Is the password correct, and is PostgreSQL running?")
except Exception as e:
    print(f"❌ An unexpected error occurred: {e}")