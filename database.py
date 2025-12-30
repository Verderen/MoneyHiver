import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.getenv('DB_NAME')
DB_USER = os.getenv('DB_USER')
DB_PASS = os.getenv('DB_PASS')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')
DB_MODE = os.getenv('DB_MODE')

DB_CONFIG = {
    'dbname': DB_NAME,
    'user': DB_USER,
    'password': DB_PASS,
    'host': DB_HOST,
    'port': DB_PORT,
    'sslmode': DB_MODE
}

def db_conn():
    conn = psycopg2.connect(**DB_CONFIG)
    return conn