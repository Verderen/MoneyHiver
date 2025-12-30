from fastapi import FastAPI, Request, Form, HTTPException, status, Body
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from models import User, SavedCalculations
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from email_service import EmailService
from datetime import datetime, timedelta
import uuid
import httpx
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(lifespan=lifespan)

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

BITCOIN = "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
ETHEREUM = "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"
CHECK_INTERVAL = 5

@app.get("/", response_class=HTMLResponse)
@app.post("/", response_class=HTMLResponse)
async def main_page(request: Request):
    user = get_current_user(request)
    user_email = user.email if user else ""

    return templates.TemplateResponse("index.html", {
        "request": request,
        "user": user,
        "user_email": user_email
    })

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

async def get_crypto_price():
    try:
        async with httpx.AsyncClient() as client:
            response = client.get(BITCOIN, timeout=5)
            return float(response.json()["price"])
    except:
        return None

def get_current_user(request: Request) -> Optional[User]:
    session_id = request.cookies.get("session_id")
    if not session_id:
        return None
    user_id = sessions.get(session_id)
    if not user_id:
        return None
    return User.get_user_by_id(user_id)

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

    return templates.TemplateResponse(
        "profile.html",
        {
            "request": request,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
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

        success = await EmailService.send_contact_message(
            user_name,
            user_email,
            user_message
        )

        if success:
            return JSONResponse({"success": "Your message has been sent successfully!"})
        else:
            return JSONResponse({"error": "Failed to send message. Please try again later."}, status_code=500)

    except Exception as error:
        print(f"Contact form error: {error}")
        return JSONResponse({"error": "An error occurred while sending your message."}, status_code=500)

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
            exchange_rate = (amount/converted_amount)

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
        asset_type: str = Body(...),
        open_price: float = Body(...),
        close_price: float = Body(...),
        amount: float = Body(...),
        volume: Optional[int] = Body(None),
        leverage: Optional[float] = Body(None)
):
    try:

        if open_price <= 0 or close_price <= 0 or amount <= 0:
            return JSONResponse({"error": "Open&close price and amount must be greater than zero!"}, status_code=400)

        if asset_type in ["crypto", "stocks"]:
            if leverage is not None and leverage <= 0:
                return JSONResponse({"error": "Leverage must be greater than zero if provided!"}, status_code=400)

        if asset_type in ["forex"]:
            if (leverage is not None and leverage <= 0) or (volume is not None and volume <= 0):
                return JSONResponse({"error": "Leverage and volume must be greater than zero!"}, status_code=400)

        if asset_type in ["forex"]:
            if (volume is not None and leverage is None) or (volume is None and leverage is not None):
                return JSONResponse({"error": "You must provide both leverage and volume!"}, status_code=400)

        position_size = 0
        pl = 0
        pl_yield = 0
        margin = 0

        if asset_type == "crypto":

            if leverage is not None and leverage > 1:
                margin = (open_price*amount) / leverage
                position_size = margin * leverage
                pl = (close_price-open_price) * amount
                pl_yield = ((close_price/open_price) - 1) * leverage * 100
            else:
                position_size = open_price * amount
                pl = (close_price - open_price) * amount
                pl_yield = ((close_price / open_price) - 1) * 100

        elif asset_type == "forex":

            position_size = volume * amount * open_price
            margin = position_size / leverage
            pl = (close_price-open_price) * volume * amount
            pl_yield = (pl/margin) * 100

        elif asset_type == "stocks":

            if leverage is not None and leverage > 1:
                margin = (open_price*amount) / leverage
                position_size = margin * leverage
                pl = (close_price-open_price) * amount
                pl_yield = ((close_price / open_price) - 1) * leverage * 100
            else:
                position_size = amount * open_price
                pl = (close_price - open_price) * amount
                pl_yield = ((close_price / open_price) - 1) * 100

        return JSONResponse({
            "status": "success",
            "result": {
                "asset_type": asset_type,
                "open_price": open_price,
                "close_price": close_price,
                "amount": amount,
                "volume": volume,
                "leverage": leverage,
                "position_size": position_size,
                "profit_loss": pl,
                "profit_loss_yield": pl_yield,
                "margin": margin
            }
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/dividend")
async def dividend(
        price_of_1_share: float = Body(...),
        from_currency: str = Body(...),
        number_of_shares: float = Body(...),
        div_per_1_share: float = Body(...),
        pay_period: str = Body(...),
        own_period: float = Body(...),
        tax_rate: Optional[float] = Body(None),
        div_growth: Optional[float] = Body(None)
):
    try:
        if price_of_1_share <= 0:
            return JSONResponse({"error": "The price of 1 share must be greater than zero!"}, status_code=400)
        if number_of_shares <= 0:
            return JSONResponse({"error": "The number of shares rate must be greater than zero!"}, status_code=400)
        if div_per_1_share <= 0:
            return JSONResponse({"error": "The dividend per 1 share must be greater than zero!"}, status_code=400)
        if own_period <= 0:
            return JSONResponse({"error": "The ownership period must be greater than zero!"}, status_code=400)

        if tax_rate is not None and tax_rate < 0:
            return JSONResponse({"error": "Tax rate cannot be negative!"}, status_code=400)
        if div_growth is not None and div_growth < 0:
            return JSONResponse({"error": "Dividend growth cannot be negative!"}, status_code=400)

        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://openexchangerates.org/api/latest.json?app_id={API_KEY_ER}")
            data = response.json()
            rates = data['rates']

            if from_currency not in rates:
                return JSONResponse({"error": "Currency is not supported!"}, status_code=400)

            usd_rate = rates[from_currency]
            price_of_1_share_usd = price_of_1_share / usd_rate
            div_per_1_share_usd = div_per_1_share / usd_rate
            period_multiplier = 12 if pay_period == "month" else 1

            tax_percent = tax_rate / 100 if tax_rate else 0
            growth_percent = div_growth / 100 if div_growth else 0

            total_div = 0
            div_yield = 0
            total_div_yield = 0
            invest = 0
            div_income_1_asset = 0
            div_income_all_assets = 0
            div_income_total = 0
            ann_div_yield = 0
            tot_div_inc = 0
            total_period_div_yield = 0
            total_return = 0
            ave_ann_ret = 0

            beginning_value = price_of_1_share_usd * number_of_shares
            annual_div_per_share_basic = div_per_1_share_usd * period_multiplier
            div_income_1_asset_basic = annual_div_per_share_basic
            div_income_all_assets_basic = div_income_1_asset_basic * number_of_shares

            if not tax_rate and not div_growth:
                annual_div_per_share = annual_div_per_share_basic
                total_div_per_share = annual_div_per_share * own_period
                total_div = total_div_per_share * number_of_shares
                div_yield = (annual_div_per_share / price_of_1_share_usd) * 100
                total_div_yield = (total_div / beginning_value) * 100
                invest = beginning_value
                div_income_1_asset = div_income_1_asset_basic
                div_income_all_assets = div_income_all_assets_basic
                div_income_total = div_income_all_assets * own_period
                ending_value = beginning_value + div_income_total
                if own_period > 0 and beginning_value > 0:
                    ave_ann_ret = ((ending_value / beginning_value) ** (1 / own_period) - 1) * 100

            elif tax_rate and not div_growth:
                annual_div_per_share = annual_div_per_share_basic * (1 - tax_percent)
                total_div_per_share = annual_div_per_share * own_period
                total_div = total_div_per_share * number_of_shares
                div_yield = (annual_div_per_share / price_of_1_share_usd) * 100
                total_div_yield = (total_div / beginning_value) * 100
                x = annual_div_per_share_basic * tax_percent
                y = annual_div_per_share_basic - x
                ann_div_yield = (y / price_of_1_share_usd) * 100
                div_income_total = total_div
                ending_value = beginning_value + div_income_total
                if own_period > 0 and beginning_value > 0:
                    ave_ann_ret = ((ending_value / beginning_value) ** (1 / own_period) - 1) * 100

            elif not tax_rate and div_growth:
                annual_div_per_share = annual_div_per_share_basic

                if growth_percent > 0:
                    total_div_per_share = annual_div_per_share * (
                                ((1 + growth_percent) ** own_period - 1) / growth_percent)
                else:
                    total_div_per_share = annual_div_per_share * own_period
                total_div = total_div_per_share * number_of_shares
                div_yield = (annual_div_per_share / price_of_1_share_usd) * 100
                total_div_yield = (total_div / beginning_value) * 100
                tot_div_inc = (div_income_all_assets_basic * (((
                                                                           1 + growth_percent) ** own_period) - 1)) / growth_percent if growth_percent > 0 else div_income_all_assets_basic * own_period
                ann_div_yield = (annual_div_per_share / price_of_1_share_usd) * 100
                total_period_div_yield = (tot_div_inc / beginning_value) * 100
                total_return = total_period_div_yield
                div_income_total = tot_div_inc
                ending_value = beginning_value + div_income_total
                if own_period > 0 and beginning_value > 0:
                    ave_ann_ret = ((ending_value / beginning_value) ** (1 / own_period) - 1) * 100

            elif tax_rate and div_growth:
                annual_div_per_share = annual_div_per_share_basic * (1 - tax_percent)

                if growth_percent > 0:
                    total_div_per_share = annual_div_per_share * (
                                ((1 + growth_percent) ** own_period - 1) / growth_percent)
                else:
                    total_div_per_share = annual_div_per_share * own_period
                total_div = total_div_per_share * number_of_shares
                div_yield = (annual_div_per_share / price_of_1_share_usd) * 100
                total_div_yield = (total_div / beginning_value) * 100
                total_return = total_div_yield
                div_income_1_asset = div_income_1_asset_basic
                div_after_tax = div_income_1_asset * (1 - tax_percent)
                ann_div_yield = (annual_div_per_share / price_of_1_share_usd) * 100
                total_period_div_yield = (total_div / beginning_value) * 100
                div_income_total = total_div
                ending_value = beginning_value + div_income_total
                if own_period > 0 and beginning_value > 0:
                    ave_ann_ret = ((ending_value / beginning_value) ** (1 / own_period) - 1) * 100

            total_div_original = total_div * usd_rate
            invest_original = invest * usd_rate
            tot_div_inc_original = tot_div_inc * usd_rate
            div_income_total_original = div_income_total * usd_rate

            return JSONResponse({
                "status": "success",
                "result": {
                    "total_div": total_div_original,
                    "div_yield": div_yield,
                    "total_div_yield": total_div_yield,
                    "invest": invest_original,
                    "div_income_total": div_income_total_original,
                    "ave_ann_ret": ave_ann_ret,
                    "ann_div_yield": ann_div_yield,
                    "tot_div_inc": tot_div_inc_original,
                    "total_period_div_yield": total_period_div_yield,
                    "total_return": total_return
                }
            })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/margin")
async def margin(
        asset_type: str = Body(...),
        price_per_1_share: float = Body(...),
        number_of_shares: float = Body(...),
        leverage: float = Body(...)
):
    try:
        if price_per_1_share <= 0 or number_of_shares <= 0 or leverage <= 0:
            return JSONResponse({"error": "Price per 1 share, number of shares and leverage must be greater than zero!"}, status_code=400)

        volume = price_per_1_share * number_of_shares
        margin = volume / leverage

        result = {
            "price_per_1_share": price_per_1_share,
            "number_of_shares": number_of_shares,
            "volume": volume,
            "leverage": leverage,
            "margin": margin
        }

        return JSONResponse({
            "status": "success",
            "result": result
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/rrr")
async def rrr(
        open_price: float = Body(...),
        take_profit: float = Body(...),
        stop_loss: float = Body(...),
        balance: float = Body(...),
        risk_per_trade: float = Body(...)
):
    try:

        if open_price <= 0 or take_profit <= 0 or stop_loss <= 0 or balance <= 0 or risk_per_trade <= 0:
            return JSONResponse({"error": "All the values must be greater than zero!"}, status_code=400)

        if stop_loss >= open_price:
            return JSONResponse({"error": "Stop loss must be less than open price!"}, status_code=400)

        if take_profit <= open_price:
            return JSONResponse({"error": "Take profit must be greater than open price!"}, status_code=400)

        risk_per_share = open_price - stop_loss
        profit_per_share = take_profit - open_price
        total_risk = (risk_per_trade / 100) * balance
        position_size = total_risk / risk_per_share
        position_cost = position_size * open_price
        rrr = profit_per_share / risk_per_share
        total_profit = profit_per_share * position_size
        balance_after_profit = balance + total_profit
        balance_after_loss = balance - total_risk

        return JSONResponse({
            "status": "success",
            "result": {
                "position_size": position_size,
                "position_cost": position_cost,
                "rrr": rrr,
                "profit_per_share": profit_per_share,
                "risk_per_share": risk_per_share,
                "total_profit": total_profit,
                "total_risk": total_risk,
                "balance_after_profit": balance_after_profit,
                "balance_after_loss": balance_after_loss
            }
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/save_pl")
async def save_pl(
        request: Request,
        trade_data: dict = Body(...)
):
    try:
        user = get_current_user(request)
        if not user:
            return JSONResponse({"error": "You must be logged in to save trades"}, status_code=401)

        asset_type = trade_data.get('asset_type', '')
        open_price = trade_data.get('open_price', 0)
        close_price = trade_data.get('close_price', 0)
        amount = trade_data.get('amount', 0)
        volume = trade_data.get('volume')
        leverage = trade_data.get('leverage')
        position_size = trade_data.get('position_size', 0)
        profit_loss = trade_data.get('profit_loss', 0)
        profit_loss_yield = trade_data.get('profit_loss_yield', 0)
        margin = trade_data.get('margin')

        calculation_id = SavedCalculations.save_profit_loss(
            user_id=user.id,
            title=trade_data.get('title', 'Untitled Trade'),
            calculation_date=trade_data.get('date'),
            asset_type=asset_type,
            open_price=open_price,
            close_price=close_price,
            amount=amount,
            volume=volume,
            leverage=leverage,
            position_size=position_size,
            profit_loss=profit_loss,
            profit_loss_yield=profit_loss_yield,
            margin=margin
        )

        return JSONResponse({
            "success": f"Trade '{trade_data.get('title', 'Untitled')}' saved successfully!",
            "calculation_id": calculation_id
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/save_div")
async def save_div(
        request: Request,
        div_data: dict = Body(...)
):
    try:
        user = get_current_user(request)
        if not user:
            return JSONResponse({"error": "You must be logged in to save dividend calculations"}, status_code=401)

        price_of_1_share = div_data.get('price_of_1_share', 0)
        from_currency = div_data.get('from_currency', 'USD')
        number_of_shares = div_data.get('number_of_shares', 0)
        div_per_1_share = div_data.get('div_per_1_share', 0)
        pay_period = div_data.get('pay_period', 'year')
        own_period = div_data.get('own_period', 0)
        tax_rate = div_data.get('tax_rate')
        div_growth = div_data.get('div_growth')
        total_div = div_data.get('total_div', 0)
        div_yield = div_data.get('div_yield', 0)
        total_div_yield = div_data.get('total_div_yield', 0)
        invest = div_data.get('invest', 0)
        ann_div_yield = div_data.get('ann_div_yield', 0)
        total_period_div_yield = div_data.get('total_period_div_yield', 0)
        total_return = div_data.get('total_return', 0)
        ave_ann_ret = div_data.get('ave_ann_ret', 0)

        calculation_id = SavedCalculations.save_dividend(
            user_id=user.id,
            title=div_data.get('title', 'Untitled Dividend Calculation'),
            calculation_date=div_data.get('date'),
            price_of_1_share=price_of_1_share,
            from_currency=from_currency,
            number_of_shares=number_of_shares,
            div_per_1_share=div_per_1_share,
            pay_period=pay_period,
            own_period=own_period,
            tax_rate=tax_rate,
            div_growth=div_growth,
            total_div=total_div,
            div_yield=div_yield,
            total_div_yield=total_div_yield,
            invest=invest,
            ann_div_yield=ann_div_yield,
            total_period_div_yield=total_period_div_yield,
            total_return=total_return,
            ave_ann_ret=ave_ann_ret
        )

        return JSONResponse({
            "success": f"Trade '{div_data.get('title', 'Untitled')}' saved successfully!",
            "calculation_id": calculation_id
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/save_rrr")
async def save_rrr(
        request: Request,
        rrr_data: dict = Body(...)
):
    try:
        user = get_current_user(request)
        if not user:
            return JSONResponse({"error": "You must be logged in to save RRR calculations"}, status_code=401)

        open_price = rrr_data.get('open_price', 0)
        take_profit = rrr_data.get('take_profit', 0)
        stop_loss = rrr_data.get('stop_loss', 0)
        balance = rrr_data.get('balance', 0)
        risk_per_trade = rrr_data.get('risk_per_trade', 0)
        position_size = rrr_data.get('position_size', 0)
        position_cost = rrr_data.get('position_cost', 0)
        rrr = rrr_data.get('rrr', 0)
        profit_per_share = rrr_data.get('profit_per_share', 0)
        risk_per_share = rrr_data.get('risk_per_share', 0)
        total_profit = rrr_data.get('total_profit', 0)
        total_risk = rrr_data.get('total_risk', 0)
        balance_after_profit = rrr_data.get('balance_after_profit', 0)
        balance_after_loss = rrr_data.get('balance_after_loss', 0)

        calculation_id = SavedCalculations.save_rrr(
            user_id=user.id,
            title=rrr_data.get('title', 'Untitled RRR Calculation'),
            calculation_date=rrr_data.get('date'),
            open_price=open_price,
            take_profit=take_profit,
            stop_loss=stop_loss,
            balance=balance,
            risk_per_trade=risk_per_trade,
            position_size=position_size,
            position_cost=position_cost,
            rrr=rrr,
            profit_per_share=profit_per_share,
            risk_per_share=risk_per_share,
            total_profit=total_profit,
            total_risk=total_risk,
            balance_after_profit=balance_after_profit,
            balance_after_loss=balance_after_loss
        )

        return JSONResponse({
            "success": f"Trade '{rrr_data.get('title', 'Untitled')}' saved successfully!",
            "calculation_id": calculation_id
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/get_saved_pl")
async def get_saved_pl(request: Request):

    user = get_current_user(request)
    if not user:
        return JSONResponse({"error": "Authentication required"}, status_code=401)

    try:
        calculations = SavedCalculations.get_user_profit_loss_calculations(user.id)
        return JSONResponse({
            "success": True,
            "calculations": calculations
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/get_saved_div")
async def get_saved_div(request: Request):

    user = get_current_user(request)
    if not user:
        return JSONResponse({"error": "Authentication required"}, status_code=401)

    try:
        calculations = SavedCalculations.get_user_dividend_calculations(user.id)
        return JSONResponse({
            "success": True,
            "calculations": calculations
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/get_saved_rrr")
async def get_saved_rrr(request: Request):

    user = get_current_user(request)
    if not user:
        return JSONResponse({"error": "Authentication required"}, status_code=401)

    try:
        calculations = SavedCalculations.get_user_rrr_calculations(user.id)
        return JSONResponse({
            "success": True,
            "calculations": calculations
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/get_pl_details")
async def get_pl_details(request: Request, id: int):

    user = get_current_user(request)
    if not user:
        return JSONResponse({"error": "Authentication required"}, status_code=401)

    try:
        calculation = SavedCalculations.get_profit_loss_details(id, user.id)
        if calculation:
            return JSONResponse({
                "success": True,
                "calculation": calculation
            })
        else:
            return JSONResponse({"error": "Calculation not found"}, status_code=404)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/get_div_details")
async def get_div_details(request: Request, id: int):

    user = get_current_user(request)
    if not user:
        return JSONResponse({"error": "Authentication required"}, status_code=401)

    try:
        calculation = SavedCalculations.get_dividend_details(id, user.id)
        if calculation:
            return JSONResponse({
                "success": True,
                "calculation": calculation
            })
        else:
            return JSONResponse({"error": "Calculation not found"}, status_code=404)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/get_rrr_details")
async def get_rrr_details(request: Request, id: int):

    user = get_current_user(request)
    if not user:
        return JSONResponse({"error": "Authentication required"}, status_code=401)

    try:
        calculation = SavedCalculations.get_rrr_details(id, user.id)
        if calculation:
            return JSONResponse({
                "success": True,
                "calculation": calculation
            })
        else:
            return JSONResponse({"error": "Calculation not found"}, status_code=404)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/delete_pl")
async def delete_pl(request: Request, calculation_data: dict = Body(...)):

    user = get_current_user(request)
    if not user:
        return JSONResponse({"error": "Authentication required"}, status_code=401)

    try:
        calculation_id = calculation_data.get('calculation_id')
        if not calculation_id:
            return JSONResponse({"error": "Calculation ID is required"}, status_code=400)

        success = SavedCalculations.delete_profit_loss_calculation(calculation_id, user.id)
        if success:
            return JSONResponse({"success": True, "message": "Calculation deleted successfully"})
        else:
            return JSONResponse({"error": "Calculation not found or access denied"}, status_code=404)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/delete_div")
async def delete_div(request: Request, calculation_data: dict = Body(...)):

    user = get_current_user(request)
    if not user:
        return JSONResponse({"error": "Authentication required"}, status_code=401)

    try:
        calculation_id = calculation_data.get('calculation_id')
        if not calculation_id:
            return JSONResponse({"error": "Calculation ID is required"}, status_code=400)

        success = SavedCalculations.delete_dividend_calculation(calculation_id, user.id)
        if success:
            return JSONResponse({"success": True, "message": "Calculation deleted successfully"})
        else:
            return JSONResponse({"error": "Calculation not found or access denied"}, status_code=404)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/delete_rrr")
async def delete_rrr(request: Request, calculation_data: dict = Body(...)):

    user = get_current_user(request)
    if not user:
        return JSONResponse({"error": "Authentication required"}, status_code=401)

    try:
        calculation_id = calculation_data.get('calculation_id')
        if not calculation_id:
            return JSONResponse({"error": "Calculation ID is required"}, status_code=400)

        success = SavedCalculations.delete_rrr_calculation(calculation_id, user.id)
        if success:
            return JSONResponse({"success": True, "message": "Calculation deleted successfully"})
        else:
            return JSONResponse({"error": "Calculation not found or access denied"}, status_code=404)
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
            return {"price": round(data["c"], 2)}
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))

#if __name__ == "__main__":
#    import uvicorn
#    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))