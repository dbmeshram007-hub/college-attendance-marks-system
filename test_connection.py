import psycopg2

# IMPORTANT: Put your actual password here
DB_PASSWORD = "YOUR_ACTUAL_PASSWORD" 

try:
    print("Attempting to connect to PostgreSQL...")
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="password",
        host="127.0.0.1",
        port="5433"
    )
    print("✅ CONNECTION SUCCESSFUL!")
    conn.close()
except Exception as e:
    print("❌ CONNECTION FAILED.")
    print(f"Error details: {e}")