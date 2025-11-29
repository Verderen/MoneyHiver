import os
import resend

resend.api_key = os.getenv("RESEND_API_KEY")

class EmailService:
    @staticmethod
    async def send_contact_message(name: str, user_email: str, message: str) -> bool:
        """Отправка сообщения из контактной формы через Resend"""
        try:
            admin_email = "getnetassistance@gmail.com"

            params = {
                "from": "MoneyHiver <onboarding@resend.dev>",
                "to": [admin_email],
                "subject": f"MoneyHiver Contact Form: {name}",
                "html": f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background: #f8f9fa; padding: 20px; border-radius: 5px; }}
                        .content {{ background: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }}
                        .field {{ margin-bottom: 15px; }}
                        .label {{ font-weight: bold; color: #555; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>New Contact Form Submission</h2>
                        </div>
                        <div class="content">
                            <div class="field">
                                <span class="label">From:</span> {name}
                            </div>
                            <div class="field">
                                <span class="label">Email:</span> {user_email}
                            </div>
                            <div class="field">
                                <span class="label">Message:</span>
                                <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                                    {message}
                                </div>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """
            }

            print(f"🔧 Sending contact email to {admin_email} via Resend")

            # Отправка email через Resend
            result = resend.Emails.send(params)

            if result and 'id' in result:
                print(f"✅ Contact email sent via Resend to {admin_email}, ID: {result['id']}")
                return True
            else:
                print(f"❌ Resend error (contact): {result}")
                return False

        except Exception as e:
            print(f"❌ Email service error (contact): {e}")
            return False

    @staticmethod
    async def send_price_alert(user_email: str, asset: str, current_price: float, target_price: float) -> bool:
        """Отправка уведомления о цене через Resend"""
        try:
            params = {
                "from": "MoneyHiver Alerts <alerts@resend.dev>",
                "to": [user_email],
                "subject": f"🚀 {asset} Price Alert!",
                "html": f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .alert {{ background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 20px; }}
                        .price {{ font-size: 24px; font-weight: bold; color: #28a745; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="alert">
                            <h2>Price Alert Triggered! 🚀</h2>
                            <p><strong>Asset:</strong> {asset}</p>
                            <p><strong>Current Price:</strong> <span class="price">${current_price:,.2f}</span></p>
                            <p><strong>Your Target:</strong> ${target_price:,.2f}</p>
                            <p>The price has reached your target level!</p>
                        </div>
                    </div>
                </body>
                </html>
                """
            }

            print(f"🔧 Sending price alert to {user_email} via Resend")

            result = resend.Emails.send(params)

            if result and 'id' in result:
                print(f"✅ Price alert sent via Resend to {user_email}, ID: {result['id']}")
                return True
            else:
                print(f"❌ Resend error (alert): {result}")
                return False

        except Exception as e:
            print(f"❌ Email service error (alert): {e}")
            return False

    @staticmethod
    async def send_welcome_email(user_email: str, username: str) -> bool:
        """Отправка приветственного email через Resend"""
        try:
            params = {
                "from": "MoneyHiver <welcome@resend.dev>",
                "to": [user_email],
                "subject": "Welcome to MoneyHiver! 🎉",
                "html": f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .welcome {{ background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="welcome">
                            <h2>Welcome to MoneyHiver, {username}! 🎉</h2>
                            <p>Thank you for joining our financial platform. We're excited to help you track and manage your investments.</p>
                            <p>You can now:</p>
                            <ul>
                                <li>Monitor real-time crypto, stocks, and exchange rates</li>
                                <li>Use our advanced financial calculators</li>
                                <li>Set up price alerts</li>
                                <li>Save your calculations</li>
                            </ul>
                            <p>Happy investing!</p>
                            <p><strong>The MoneyHiver Team</strong></p>
                        </div>
                    </div>
                </body>
                </html>
                """
            }

            print(f"🔧 Sending welcome email to {user_email} via Resend")

            result = resend.Emails.send(params)

            if result and 'id' in result:
                print(f"✅ Welcome email sent via Resend to {user_email}, ID: {result['id']}")
                return True
            else:
                print(f"❌ Resend error (welcome): {result}")
                return False

        except Exception as e:
            print(f"❌ Email service error (welcome): {e}")
            return False