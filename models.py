from database import db_conn
import bcrypt
from datetime import datetime
import json

class User:
    def __init__(self, user_id, username, email=None):
        self.id = user_id
        self.username = username
        self.email = email

    @staticmethod
    def get_user_by_credentials(email, password):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id, username, password_hash, email FROM users WHERE email = %s",
                (email,)
            )
            user_data = cursor.fetchone()

            if user_data:
                user_id, username, stored_hash, user_email = user_data
                if bcrypt.checkpw(password.encode(), stored_hash.encode()):
                    return User(user_id, username, user_email)
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
                "SELECT user_id, username, email FROM users WHERE user_id = %s",
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

class SavedCalculations:

    @staticmethod
    def save_profit_loss(user_id, title, calculation_date, asset_type, open_price, close_price, amount, volume, leverage, position_size, profit_loss, profit_loss_yield, margin):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO saved_profit_loss (user_id, title, calculation_date, asset_type, open_price, close_price, amount, volume, leverage, position_size, profit_loss, profit_loss_yield, margin)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING calculation_id""",
                (user_id, title, calculation_date, asset_type, open_price, close_price, amount, volume, leverage, position_size, profit_loss, profit_loss_yield, margin)
            )
            calculation_id = cursor.fetchone()[0]
            conn.commit()
            return calculation_id
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def save_dividend(user_id, title, calculation_date, price_of_1_share, from_currency, number_of_shares, div_per_1_share, pay_period, own_period, tax_rate, div_growth, total_div, div_yield, total_div_yield, invest, ann_div_yield, total_period_div_yield, total_return, ave_ann_ret):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO saved_dividend (user_id, title, calculation_date, price_of_1_share, from_currency, number_of_shares, div_per_1_share, pay_period, own_period, tax_rate, div_growth, total_div, div_yield, total_div_yield, invest, ann_div_yield, total_period_div_yield, total_return, ave_ann_ret)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING calculation_id""",
                (user_id, title, calculation_date, price_of_1_share, from_currency, number_of_shares, div_per_1_share, pay_period, own_period, tax_rate, div_growth, total_div, div_yield, total_div_yield, invest, ann_div_yield, total_period_div_yield, total_return, ave_ann_ret)
            )
            calculation_id = cursor.fetchone()[0]
            conn.commit()
            return calculation_id
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def save_rrr(user_id, title, calculation_date, open_price, take_profit, stop_loss, balance, risk_per_trade, position_size, position_cost, rrr, profit_per_share, risk_per_share, total_profit, total_risk, balance_after_profit, balance_after_loss):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO saved_rrr (user_id, title, calculation_date, open_price, take_profit, stop_loss, balance, risk_per_trade, position_size, position_cost, rrr, profit_per_share, risk_per_share, total_profit, total_risk, balance_after_profit, balance_after_loss)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING calculation_id""",
                (user_id, title, calculation_date, open_price, take_profit, stop_loss, balance, risk_per_trade, position_size, position_cost, rrr, profit_per_share, risk_per_share, total_profit, total_risk, balance_after_profit, balance_after_loss)
            )
            calculation_id = cursor.fetchone()[0]
            conn.commit()
            return calculation_id
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def _serialize_date(date_obj):
        """Преобразует datetime объект в строку"""
        if date_obj is None:
            return None
        if isinstance(date_obj, datetime):
            return date_obj.isoformat()
        if isinstance(date_obj, str):
            # Если это уже строка, возвращаем как есть
            return date_obj
        # Для других типов пытаемся преобразовать в строку
        return str(date_obj)

    @staticmethod
    def get_user_profit_loss_calculations(user_id):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT calculation_id, title, calculation_date, asset_type, 
                open_price, close_price, amount, volume, leverage, position_size, 
                profit_loss, profit_loss_yield, margin, created_at
                FROM saved_profit_loss 
                WHERE user_id = %s 
                ORDER BY created_at DESC""",
                (user_id,)
            )
            calculations = []
            for row in cursor.fetchall():
                calculations.append({
                    'calculation_id': row[0],
                    'title': row[1],
                    'calculation_date': SavedCalculations._serialize_date(row[2]),
                    'asset_type': row[3],
                    'open_price': float(row[4]) if row[4] is not None else None,
                    'close_price': float(row[5]) if row[5] is not None else None,
                    'amount': float(row[6]) if row[6] is not None else None,
                    'volume': row[7],
                    'leverage': float(row[8]) if row[8] is not None else None,
                    'position_size': float(row[9]) if row[9] is not None else None,
                    'profit_loss': float(row[10]) if row[10] is not None else None,
                    'profit_loss_yield': float(row[11]) if row[11] is not None else None,
                    'margin': float(row[12]) if row[12] is not None else None,
                    'created_at': SavedCalculations._serialize_date(row[13])
                })
            return calculations
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_user_dividend_calculations(user_id):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT calculation_id, title, 
                       TO_CHAR(calculation_date, 'YYYY-MM-DD HH24:MI:SS'), 
                       price_of_1_share, from_currency, number_of_shares, 
                       div_per_1_share, pay_period, own_period, tax_rate, 
                       div_growth, total_div, div_yield, total_div_yield, 
                       invest, ann_div_yield, total_period_div_yield, 
                       total_return, ave_ann_ret, 
                       TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS')
                FROM saved_dividend 
                WHERE user_id = %s 
                ORDER BY created_at DESC""",
                (user_id,)
            )
            calculations = []
            for row in cursor.fetchall():
                calculations.append({
                    'calculation_id': row[0],
                    'title': row[1],
                    'calculation_date': SavedCalculations._serialize_date(row[2]),
                    'price_of_1_share': float(row[3]) if row[3] is not None else None,
                    'from_currency': row[4],
                    'number_of_shares': float(row[5]) if row[5] is not None else None,
                    'div_per_1_share': float(row[6]) if row[6] is not None else None,
                    'pay_period': row[7],
                    'own_period': float(row[8]) if row[8] is not None else None,
                    'tax_rate': float(row[9]) if row[9] is not None else None,
                    'div_growth': float(row[10]) if row[10] is not None else None,
                    'total_div': float(row[11]) if row[11] is not None else None,
                    'div_yield': float(row[12]) if row[12] is not None else None,
                    'total_div_yield': float(row[13]) if row[13] is not None else None,
                    'invest': float(row[14]) if row[14] is not None else None,
                    'ann_div_yield': float(row[15]) if row[15] is not None else None,
                    'total_period_div_yield': float(row[16]) if row[16] is not None else None,
                    'total_return': float(row[17]) if row[17] is not None else None,
                    'ave_ann_ret': float(row[18]) if row[18] is not None else None,
                    'created_at': SavedCalculations._serialize_date(row[19])
                })
            return calculations
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_user_rrr_calculations(user_id):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT calculation_id, title, calculation_date, open_price, 
                take_profit, stop_loss, balance, risk_per_trade, position_size, 
                position_cost, rrr, profit_per_share, risk_per_share, total_profit, 
                total_risk, balance_after_profit, balance_after_loss, created_at
                FROM saved_rrr 
                WHERE user_id = %s 
                ORDER BY created_at DESC""",
                (user_id,)
            )
            calculations = []
            for row in cursor.fetchall():
                calculations.append({
                    'calculation_id': row[0],
                    'title': row[1],
                    'calculation_date': SavedCalculations._serialize_date(row[2]),
                    'open_price': float(row[3]) if row[3] is not None else None,
                    'take_profit': float(row[4]) if row[4] is not None else None,
                    'stop_loss': float(row[5]) if row[5] is not None else None,
                    'balance': float(row[6]) if row[6] is not None else None,
                    'risk_per_trade': float(row[7]) if row[7] is not None else None,
                    'position_size': float(row[8]) if row[8] is not None else None,
                    'position_cost': float(row[9]) if row[9] is not None else None,
                    'rrr': float(row[10]) if row[10] is not None else None,
                    'profit_per_share': float(row[11]) if row[11] is not None else None,
                    'risk_per_share': float(row[12]) if row[12] is not None else None,
                    'total_profit': float(row[13]) if row[13] is not None else None,
                    'total_risk': float(row[14]) if row[14] is not None else None,
                    'balance_after_profit': float(row[15]) if row[15] is not None else None,
                    'balance_after_loss': float(row[16]) if row[16] is not None else None,
                    'created_at': SavedCalculations._serialize_date(row[17])
                })
            return calculations
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_profit_loss_details(calculation_id, user_id):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT calculation_id, title, calculation_date, asset_type, 
                open_price, close_price, amount, volume, leverage, position_size, 
                profit_loss, profit_loss_yield, margin, created_at
                FROM saved_profit_loss 
                WHERE calculation_id = %s AND user_id = %s""",
                (calculation_id, user_id)
            )
            row = cursor.fetchone()
            if row:
                return {
                    'calculation_id': row[0],
                    'title': row[1],
                    'calculation_date': SavedCalculations._serialize_date(row[2]),
                    'asset_type': row[3],
                    'open_price': float(row[4]) if row[4] is not None else None,
                    'close_price': float(row[5]) if row[5] is not None else None,
                    'amount': float(row[6]) if row[6] is not None else None,
                    'volume': row[7],
                    'leverage': float(row[8]) if row[8] is not None else None,
                    'position_size': float(row[9]) if row[9] is not None else None,
                    'profit_loss': float(row[10]) if row[10] is not None else None,
                    'profit_loss_yield': float(row[11]) if row[11] is not None else None,
                    'margin': float(row[12]) if row[12] is not None else None,
                    'created_at': SavedCalculations._serialize_date(row[13])
                }
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_dividend_details(calculation_id, user_id):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT calculation_id, title, calculation_date, price_of_1_share, 
                from_currency, number_of_shares, div_per_1_share, pay_period, own_period, 
                tax_rate, div_growth, total_div, div_yield, total_div_yield, invest, 
                ann_div_yield, total_period_div_yield, total_return, ave_ann_ret, created_at
                FROM saved_dividend 
                WHERE calculation_id = %s AND user_id = %s""",
                (calculation_id, user_id)
            )
            row = cursor.fetchone()
            if row:
                return {
                    'calculation_id': row[0],
                    'title': row[1],
                    'calculation_date': SavedCalculations._serialize_date(row[2]),
                    'price_of_1_share': float(row[3]) if row[3] is not None else None,
                    'from_currency': row[4],
                    'number_of_shares': float(row[5]) if row[5] is not None else None,
                    'div_per_1_share': float(row[6]) if row[6] is not None else None,
                    'pay_period': row[7],
                    'own_period': float(row[8]) if row[8] is not None else None,
                    'tax_rate': float(row[9]) if row[9] is not None else None,
                    'div_growth': float(row[10]) if row[10] is not None else None,
                    'total_div': float(row[11]) if row[11] is not None else None,
                    'div_yield': float(row[12]) if row[12] is not None else None,
                    'total_div_yield': float(row[13]) if row[13] is not None else None,
                    'invest': float(row[14]) if row[14] is not None else None,
                    'ann_div_yield': float(row[15]) if row[15] is not None else None,
                    'total_period_div_yield': float(row[16]) if row[16] is not None else None,
                    'total_return': float(row[17]) if row[17] is not None else None,
                    'ave_ann_ret': float(row[18]) if row[18] is not None else None,
                    'created_at': SavedCalculations._serialize_date(row[19])
                }
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_rrr_details(calculation_id, user_id):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT calculation_id, title, calculation_date, open_price, 
                take_profit, stop_loss, balance, risk_per_trade, position_size, 
                position_cost, rrr, profit_per_share, risk_per_share, total_profit, 
                total_risk, balance_after_profit, balance_after_loss, created_at
                FROM saved_rrr 
                WHERE calculation_id = %s AND user_id = %s""",
                (calculation_id, user_id)
            )
            row = cursor.fetchone()
            if row:
                return {
                    'calculation_id': row[0],
                    'title': row[1],
                    'calculation_date': SavedCalculations._serialize_date(row[2]),
                    'open_price': float(row[3]) if row[3] is not None else None,
                    'take_profit': float(row[4]) if row[4] is not None else None,
                    'stop_loss': float(row[5]) if row[5] is not None else None,
                    'balance': float(row[6]) if row[6] is not None else None,
                    'risk_per_trade': float(row[7]) if row[7] is not None else None,
                    'position_size': float(row[8]) if row[8] is not None else None,
                    'position_cost': float(row[9]) if row[9] is not None else None,
                    'rrr': float(row[10]) if row[10] is not None else None,
                    'profit_per_share': float(row[11]) if row[11] is not None else None,
                    'risk_per_share': float(row[12]) if row[12] is not None else None,
                    'total_profit': float(row[13]) if row[13] is not None else None,
                    'total_risk': float(row[14]) if row[14] is not None else None,
                    'balance_after_profit': float(row[15]) if row[15] is not None else None,
                    'balance_after_loss': float(row[16]) if row[16] is not None else None,
                    'created_at': SavedCalculations._serialize_date(row[17])
                }
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def delete_profit_loss_calculation(calculation_id, user_id):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "DELETE FROM saved_profit_loss WHERE calculation_id = %s AND user_id = %s",
                (calculation_id, user_id)
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def delete_dividend_calculation(calculation_id, user_id):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "DELETE FROM saved_dividend WHERE calculation_id = %s AND user_id = %s",
                (calculation_id, user_id)
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def delete_rrr_calculation(calculation_id, user_id):
        conn = db_conn()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "DELETE FROM saved_rrr WHERE calculation_id = %s AND user_id = %s",
                (calculation_id, user_id)
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            cursor.close()
            conn.close()