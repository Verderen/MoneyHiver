from database import db_conn
import bcrypt

class User:
    def __init__(self, user_id, username, email=None, description=None):
        self.id = user_id
        self.username = username
        self.email = email
        self.description = description

    @staticmethod
    def get_user_by_credentials(email, password):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id, username, password_hash, email, description FROM users WHERE email = %s",
                (email,)
            )
            user_data = cursor.fetchone()

            if user_data:
                user_id, username, stored_hash, user_email, description = user_data
                if bcrypt.checkpw(password.encode(), stored_hash.encode()):
                    return User(user_id, username, user_email, description)
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_user_by_id(user_id):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id, username, email, description FROM users WHERE user_id = %s",
                (user_id,)
            )
            user_data = cursor.fetchone()
            if user_data:
                return User(*user_data)
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def create_user(username, email, password):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            salt = bcrypt.gensalt()
            hashed_password = bcrypt.hashpw(password.encode(), salt)
            cursor.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
                (username, email, hashed_password.decode())
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def update_description(user_id, new_description):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE  users SET description = %s WHERE user_id = %s",
                (new_description, user_id)
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

class Asset:
    @staticmethod
    def create_crypto_asset(user_id, crypto_type, amount, price_per_unit, price_currency):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO crypto_assets (user_id, crypto_type, amount, price_per_unit, price_currency)
                VALUES (%s, %s, %s, %s, %s) returning asset_id""",
                (user_id, crypto_type, amount, price_per_unit, price_currency)
            )
            asset_id = cursor.fetchone()[0]
            conn.commit()
            return asset_id
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_user_assets(user_id):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT crypto_type, amount, price_per_unit, price_currency FROM crypto_assets WHERE user_id = %s""",
                (user_id,)
            )
            crypto_assets = [{
                'type': 'crypto',
                'asset': row[0],
                'amount': float(row[1]),
                'price': float(row[2]),
                'currency': row[3]
            } for row in cursor.fetchall()]

            return crypto_assets
        finally:
            cursor.close()
            conn.close()