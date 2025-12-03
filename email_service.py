import os
import resend

resend.api_key = os.getenv("RESEND_API_KEY")

class EmailService:
    @staticmethod
    async def send_contact_message(name: str, user_email: str, message: str) -> bool:

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