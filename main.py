from fastapi import FastAPI, Request, Form, HTTPException, status, Body
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from email.mime.text import MIMEText
from models import User, Asset
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
import uuid
import smtplib
import httpx
import asyncio
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

API_KEY_ER = os.getenv("API_ID_ER")
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
SECRET_KEY = os.getenv("API_ID_SECRET_KEY")

SMTP_SERVER = os.getenv("SERVER")
SMTP_PORT = os.getenv("SMTP_PORT")
EMAIL_ADDRESS = os.getenv("ADDRESS")
EMAIL_PASSWORD = os.getenv("PASSWORD")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

sessions = {}

@app.get("/", response_class=HTMLResponse)
@app.post("/", response_class=HTMLResponse)
async def main_page(request: Request):
    user = get_current_user(request)
    user_email = user.email if user else ""

    if request.method == "POST":
        form_data = await request.form()
        try:
            target_price = float(form_data.get("price"))
            asset = form_data.get("asset")
            if user_email and target_price and asset:
                subscribers[user_email] = {
                    "asset": asset,
                    "price": target_price
                }
        except (ValueError, TypeError):
            pass

    return templates.TemplateResponse("index.html", {
        "request": request,
        "user": user,
        "user_email": user_email
    })

BITCOIN = "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
ETHEREUM = "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"
CHECK_INTERVAL = 5
subscribers = {}

async def get_crypto_price():
    try:
        async with httpx.AsyncClient() as client:
            response = client.get(BITCOIN, timeout=5)
            return float(response.json()["price"])
    except:
        return None

def send_email(to_email, subject, body):
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = EMAIL_ADDRESS
        msg["To"] = to_email

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.sendmail(EMAIL_ADDRESS, [to_email], msg.as_string())
    except Exception as e:
        print(f"Ошибка отправки email: {e}")


async def check_prices():
    try:
        async with httpx.AsyncClient() as client:
            btc_response = await client.get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT")
            eth_response = await client.get("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT")

            btc_price = float(btc_response.json()["price"])
            eth_price = float(eth_response.json()["price"])

            return {"BTC": btc_price, "ETH": eth_price}
    except Exception as e:
        print(f"Error fetching prices: {e}")
        return None


async def check_price_loop():
    while True:
        prices = await check_prices()
        if prices:
            for email, subscription in list(subscribers.items()):
                asset = subscription["asset"]
                target_price = subscription["price"]
                current_price = prices.get(asset)

                if current_price and current_price >= target_price:
                    subject = f"🚀 {asset} reached ${current_price:.2f}!"
                    body = f"{asset} price: ${current_price:.2f}\nYour threshold: ${target_price}"
                    send_email(email, subject, body)
                    del subscribers[email]

        await asyncio.sleep(CHECK_INTERVAL)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(check_price_loop())

def get_current_user(request: Request) -> Optional[User]:
    session_id = request.cookies.get("session_id")
    if not session_id:
        return None
    user_id = sessions.get(session_id)
    if not user_id:
        return None
    return User.get_user_by_id(user_id)


@app.post("/subscribe")
async def subscribe_notification(
        request: Request,
        email: str = Form(...),
        asset: str = Form(...),
        price: float = Form(...)
):
    try:
        # Проверка авторизации
        user = get_current_user(request)
        if not user or user.email != email:
            return JSONResponse({"error": "You must be logged in to subscribe"}, status_code=401)

        if price <= 0:
            return JSONResponse({"error": "Price must be greater than zero!"}, status_code=400)

        subscribers[email] = {"asset": asset, "price": price}
        return JSONResponse({
                                "success": f"You have subscribed to {asset} price alerts! You will be notified when the price reaches ${price:.2f}"})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/signin_page", response_class=HTMLResponse)
async def signin_page_get(request: Request):
    return templates.TemplateResponse("signin.html", {"request": request})

@app.get("/signup_page", response_class=HTMLResponse)
async def signup_page_get(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request})

@app.post("/signup_page")
async def signup_page(
        username: str = Form(...),
        email: str = Form(...),
        password: str = Form(...)
):
    try:
        User.create_user(username, email, password)
        return RedirectResponse(url="/", status_code=303)
    except Exception as e:
        return templates.TemplateResponse(
            "signup.html",
            {"request": Request, "error": str(e)},
            status_code=400
        )

@app.post("/signin_page")
async def signin_page(
        request: Request,
        email: str = Form(...),
        password: str = Form(...)
):
    user = User.get_user_by_credentials(email, password)
    if not user:
        return templates.TemplateResponse(
            "signin.html",
            {"request": request, "error": "Incorrect email or password"},
            status_code=401
        )

    session_id = str(uuid.uuid4())
    sessions[session_id] = user.id

    response = RedirectResponse(url="/profile", status_code=status.HTTP_303_SEE_OTHER)
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=True,
        samesite="lax"
    )
    return response

@app.get("/logout")
async def logout():
    response = RedirectResponse(url="/")
    response.delete_cookie("session_id")
    return response

@app.get("/profile")
async def profile(request: Request):
    user = get_current_user(request)
    if not user:
        return RedirectResponse(url="/")

    assets = Asset.get_user_assets(user.id)
    return templates.TemplateResponse(
        "profile.html",
        {
            "request": request,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "assets": assets
            }
        }
    )

@app.post("/message")
async def message(
        name: str = Form(...),
        email: str = Form(...),
        message: str = Form(...)
):
    user_name = name.strip()
    user_email = email.strip()
    user_message = message.strip()

    if not all([user_name, user_email, user_message]):
        return JSONResponse({"error": "All fields are required!"}, status_code=400)

    try:
        msg = MIMEText(
            f"Name: {user_name}\n"
            f"Email: {user_email}\n\n"
            f"Message: {user_message}"
        )
        msg['Subject'] = "MoneyHiver"
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = EMAIL_ADDRESS
        msg['Reply-To'] = user_email

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)

        return JSONResponse({"success": "Your message has been sent successfully!"})
    except Exception as error:
        return JSONResponse({"error": f"Failed to send message. Please try again later. Error: {str(error)}"}, status_code=500)

@app.post("/calculate_conversion")
async def converter(
    amount: float = Body(...),
    from_currency: str = Body(...),
    to_asset: str = Body(...)
):
    try:
        if amount <= 0:
            return JSONResponse({"error": "Amount must be greater than zero!"}, status_code=400)

        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://openexchangerates.org/api/latest.json?app_id={API_KEY_ER}")
            data = response.json()
            rates = data['rates']

            if from_currency not in rates or to_asset not in rates:
                return JSONResponse({"error": "Currency is not supported!"}, status_code=400)

            usd_amount = amount / rates[from_currency]
            converted_amount = usd_amount * rates[to_asset]
            exchange_rate = (converted_amount / amount)

            return JSONResponse({
                "status": "success",
                "result": {
                    "amount": amount,
                    "from_currency": from_currency,
                    "converted_amount": converted_amount,
                    "to_asset": to_asset,
                    "exchange_rate": exchange_rate
                }
            })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/calculate_profit_loss")
async def calculate_profit_loss(
    amount: float = Body(...),
    asset: str = Body(...),
    price_before: float = Body(...),
    price_after: float = Body(...)
):
    try:
        if amount <= 0 or price_before <=0 or price_after <=0:
            return JSONResponse({"error": "All values must be greater than zero!"}, status_code=400)

        shares = amount / price_before
        current_value = shares * price_after
        profit_loss = current_value - amount
        percentage = (profit_loss / amount) * 100

        return JSONResponse({
            "status": "success",
            "result": {
                "initial_investment": amount,
                "current_value": current_value,
                "profit_loss": profit_loss,
                "percentage": percentage,
                "asset": asset
            }
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/accrued_interest")
async def accrued_interest(
        amount: float = Body(...),
        from_currency: str = Body(...),
        time_period: str = Body(...),
        interest_rate: float = Body(...)
):
    try:

        if amount <= 0:
            return JSONResponse({"error": "Amount must be greater than zero!"}, status_code=400)
        if interest_rate <= 0:
            return JSONResponse({"error": "Interest rate must be greater than zero!"}, status_code=400)

        period_multiplier = 1/12 if time_period == "month" else 1

        async with httpx.AsyncClient() as client:

            response = await client.get(f"https://openexchangerates.org/api/latest.json?app_id={API_KEY_ER}")
            data = response.json()
            rates = data['rates']
            if from_currency not in rates:
                return JSONResponse({"error": "Currency is not supported!"}, status_code=400)

            percentage = (amount * interest_rate * period_multiplier) / 100
            profit = amount + percentage

            return JSONResponse({
                "status": "success",
                "result": {
                    "amount": amount,
                    "from_currency": from_currency,
                    "time_period": time_period,
                    "interest_rate": interest_rate,
                    "percentage": percentage,
                    "profit": profit
                }
            })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/crypto_page")
async def crypto_page(request: Request):
    return templates.TemplateResponse("crypto.html", {"request": request})

@app.get("/api/crypto")
async def crypto_api():
    try:
        async with httpx.AsyncClient() as client:

            btc = await client.get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT")
            btc_data = btc.json()

            eth = await client.get("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT")
            eth_data = eth.json()

            return {
                "btc_price": float(btc_data['price']),
                "eth_price": float(eth_data['price'])
            }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))

@app.get("/exchange_rates_page", response_class=HTMLResponse)
async def exchange_rates_page(request: Request):
    return templates.TemplateResponse("er.html", {"request": request})

@app.get("/api/currency")
async def currency_api():
    try:
        async with httpx.AsyncClient() as client:

            response = await client.get(f'https://openexchangerates.org/api/latest.json?app_id={API_KEY_ER}', timeout=100)
            data = response.json()

            rub_per_usd = float(data['rates']['RUB'])

            eur_per_usd = float(data['rates']['EUR'])

            rub_per_eur = rub_per_usd / eur_per_usd

            cny_per_usd = float(data['rates']['CNY'])

            rub_per_cny = rub_per_usd / cny_per_usd

            chf_per_usd = float(data['rates']['CHF'])

            rub_per_chf = rub_per_usd / chf_per_usd

            return {
                "usdprice": round(float(rub_per_usd), 2),
                "eurprice": round(float(rub_per_eur), 2),
                "cnyprice": round(float(rub_per_cny), 2),
                "chfprice": round(float(rub_per_chf), 2)
            }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))

@app.get("/api/currency/usd")
async def get_usd_rate():
    data = await currency_api()
    return {"price": data["usdprice"]}

@app.get("/api/currency/eur")
async def get_eur_rate():
    data = await currency_api()
    return {"price": data["eurprice"]}

@app.get("/api/currency/cny")
async def get_cny_rate():
    data = await currency_api()
    return {"price": data["cnyprice"]}

@app.get("/api/currency/chf")
async def get_chf_rate():
    data = await currency_api()
    return {"price": data["chfprice"]}

@app.get("/stocks_page")
async def stocks_page(request: Request):
    return templates.TemplateResponse("stocks.html", {"request": request})

@app.get("/api/stocks/aapl")
async def get_aapl_price():
    return await get_stock_price("AAPL")

@app.get("/api/stocks/nvda")
async def get_nvda_price():
    return await get_stock_price("NVDA")

@app.get("/api/stocks/tsla")
async def get_tsla_price():
    return await get_stock_price("TSLA")

@app.get("/api/stocks/amzn")
async def get_amzn_price():
    return await get_stock_price("AMZN")

async def get_stock_price(symbol: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={FINNHUB_API_KEY}"
            )
            data = response.json()
            return {"price": round(data["c"], 2)}  # current price
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))

@app.post("/api/assets/crypto")
async def add_crypto_asset(
        request: Request,
        crypto_type: str = Body(...),
        amount: float = Body(...),
        price_per_unit: float = Body(...),
        price_currency: str = Body(...)
):
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        asset_id = Asset.create_crypto_asset(
            user.id, crypto_type, amount, price_per_unit, price_currency
        )
        return {"status": "success", "asset_id": asset_id}
    except Exception as e:
        return HTTPException(status_code=500, detail=str(e))

@app.get("/api/assets")
async def get_assets(request: Request):
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        assets = Asset.get_user_assets(user.id)
        return {"status": "success", "assets": assets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))

