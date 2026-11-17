"""SmartBite seed data. Run: cd /app/backend && python seed.py
Idempotent — skips if users already exist. Not imported by server.py."""
import asyncio
import random
from datetime import datetime, timedelta, timezone

from lib.auth import hash_password
from lib.db import db, client, ensure_indexes
from routers.orders import compute_breakdown

PASSWORD = "smartbite123"
NOW = datetime.now(timezone.utc)

INDIAN = "https://images.pexels.com/photos/32797056/pexels-photo-32797056.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
THALI2 = "https://images.pexels.com/photos/8148149/pexels-photo-8148149.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
RICE_VEG = "https://images.unsplash.com/photo-1588644525273-f37b60d78512?auto=format&fit=crop&w=900&q=80"
STEEL_TRAY = "https://images.unsplash.com/photo-1589778655375-3e622a9fc91c?auto=format&fit=crop&w=900&q=80"
SILVER_PLATE = "https://images.unsplash.com/photo-1680993032090-1ef7ea9b51e5?auto=format&fit=crop&w=900&q=80"
BIRYANI_PLATE = "https://images.pexels.com/photos/40262796/pexels-photo-40262796.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
BIRYANI2 = "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=900&q=80"
RICE_MEAT = "https://images.unsplash.com/photo-1716550781939-beb7d7247aae?auto=format&fit=crop&w=900&q=80"
BOWL_RICE = "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=900&q=80"
FRIED_RICE = "https://images.pexels.com/photos/3926133/pexels-photo-3926133.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
PIZZA_WOOD = "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=80"
PIZZA_OVEN = "https://images.unsplash.com/photo-1622880833523-7cf1c0bd4296?auto=format&fit=crop&w=900&q=80"
PIZZA_PLATE = "https://images.unsplash.com/photo-1621538997517-58ce53933faa?auto=format&fit=crop&w=900&q=80"
PIZZA_OVEN2 = "https://images.pexels.com/photos/18126737/pexels-photo-18126737.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
BURGER1 = "https://images.unsplash.com/photo-1624818213607-cc1fd1a25446?auto=format&fit=crop&w=900&q=80"
BURGER2 = "https://images.unsplash.com/photo-1687937139478-1743eb2de051?auto=format&fit=crop&w=900&q=80"
BURGER3 = "https://images.pexels.com/photos/2299981/pexels-photo-2299981.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
BURGER4 = "https://images.unsplash.com/photo-1688246780164-00c01647e78c?auto=format&fit=crop&w=900&q=80"
CAKE1 = "https://images.unsplash.com/photo-1759146233677-292a2f1a2236?auto=format&fit=crop&w=900&q=80"
CAKE2 = "https://images.unsplash.com/photo-1629272040444-2f7553ec7466?auto=format&fit=crop&w=900&q=80"
CAKE3 = "https://images.pexels.com/photos/39240989/pexels-photo-39240989.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
PASTRY = "https://images.unsplash.com/photo-1530648672449-81f6c723e2f1?auto=format&fit=crop&w=900&q=80"
CUPCAKES = "https://images.unsplash.com/photo-1469533778471-92a68acc3633?auto=format&fit=crop&w=900&q=80"
BAKERY = "https://images.pexels.com/photos/28378968/pexels-photo-28378968.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
SALAD1 = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80"
SALAD2 = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80"
SALAD3 = "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80"
SALAD4 = "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=900&q=80"
SALAD5 = "https://images.pexels.com/photos/13350113/pexels-photo-13350113.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
SALAD6 = "https://images.pexels.com/photos/842545/pexels-photo-842545.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
DUMPLINGS = "https://images.unsplash.com/photo-1543992321-cefacfc2322e?auto=format&fit=crop&w=900&q=80"
FINE_DINE = "https://images.unsplash.com/photo-1565895405227-31cffbe0cf86?auto=format&fit=crop&w=900&q=80"
PASTA = "https://images.pexels.com/photos/5531093/pexels-photo-5531093.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
STEAK = "https://images.pexels.com/photos/8864543/pexels-photo-8864543.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
EGG_BOWL = "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80"
FEAST = "https://images.pexels.com/photos/20321807/pexels-photo-20321807.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
COMBO = "https://images.pexels.com/photos/28308010/pexels-photo-28308010.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"

RESTAURANTS = [
    {"key": "saffron", "name": "Saffron & Spice Kitchen", "cuisines": ["North Indian", "Thalis"],
     "description": "Slow-cooked royal North Indian classics, thalis and tandoor breads.",
     "image_url": THALI2, "area": "Indiranagar", "rating": 4.6, "rating_count": 1240,
     "prep_time_mins": 25, "delivery_fee": 29, "cost_for_two": 450, "closes_at": "22:30",
     "commission_pct": 18.0, "plan_price": 149},
    {"key": "dilli", "name": "Dilli Darbar Biryani House", "cuisines": ["Biryani", "Mughlai"],
     "description": "Dum-cooked Hyderabadi biryanis and royal Mughlai curries.",
     "image_url": BIRYANI_PLATE, "area": "Koramangala", "rating": 4.7, "rating_count": 2130,
     "prep_time_mins": 30, "delivery_fee": 39, "cost_for_two": 550, "closes_at": "23:00",
     "commission_pct": 20.0, "plan_price": 179},
    {"key": "pizza", "name": "Artisan Crust Pizza Lab", "cuisines": ["Italian", "Pizza"],
     "description": "Wood-fired sourdough pizzas with 48-hour fermented crusts.",
     "image_url": PIZZA_WOOD, "area": "HSR Layout", "rating": 4.5, "rating_count": 980,
     "prep_time_mins": 22, "delivery_fee": 35, "cost_for_two": 500, "closes_at": "23:00",
     "commission_pct": 18.0, "plan_price": 0},
    {"key": "bao", "name": "Bao & Bowl Co.", "cuisines": ["Asian", "Chinese", "Dumplings"],
     "description": "Hand-pleated baos, wok-tossed bowls and warming soups.",
     "image_url": DUMPLINGS, "area": "Whitefield", "rating": 4.4, "rating_count": 760,
     "prep_time_mins": 20, "delivery_fee": 25, "cost_for_two": 420, "closes_at": "22:00",
     "commission_pct": 16.0, "plan_price": 0},
    {"key": "green", "name": "Green Harvest Deli", "cuisines": ["Healthy", "Salads", "Continental"],
     "description": "Farm-fresh protein bowls, salads and cold-pressed juices. Pure veg kitchen.",
     "image_url": SALAD1, "area": "Indiranagar", "rating": 4.6, "rating_count": 640,
     "prep_time_mins": 15, "delivery_fee": 19, "cost_for_two": 380, "closes_at": "21:30",
     "is_pure_veg": True, "commission_pct": 15.0, "plan_price": 129},
    {"key": "chaat", "name": "Bombay Chaat & Combo Co.", "cuisines": ["Street Food", "Chaat", "Snacks"],
     "description": "Bombay street legends — vada pav, sandwiches and butter-laden pav bhaji.",
     "image_url": FEAST, "area": "Jayanagar", "rating": 4.3, "rating_count": 1520,
     "prep_time_mins": 12, "delivery_fee": 15, "cost_for_two": 300, "closes_at": "21:00",
     "commission_pct": 14.0, "plan_price": 0},
]

# (name, desc, price, category, diet, cal, protein, allergens, ingredients, tags, spice, img, prep, surplus)
MENU = {
    "saffron": [
        ("Paneer Butter Masala Thali", "Creamy tomato-paneer gravy, dal, rice, 2 rotis, salad & papad", 249, "Thali", "veg", 720, 22, ["dairy", "nuts"], ["paneer", "tomato", "butter", "basmati", "garam masala"], ["comfort", "hot"], "medium", INDIAN, 20, None),
        ("Dal Tadka Combo", "Yellow dal tempered with ghee-garlic, jeera rice and 2 rotis", 199, "Thali", "veg", 610, 18, ["gluten", "dairy"], ["toor dal", "ghee", "basmati", "wheat roti", "cumin"], ["comfort", "hot"], "mild", STEEL_TRAY, 18, (199, 129, 5)),
        ("Butter Chicken Bowl", "Tandoori chicken simmered in silky makhani gravy", 289, "Main Course", "nonveg", 690, 34, ["dairy"], ["chicken", "butter", "cream", "tomato", "kasuri methi"], ["comfort", "hot", "protein-rich"], "medium", SILVER_PLATE, 22, None),
        ("Tandoori Roti (3 pcs)", "Whole wheat rotis straight from the clay oven", 79, "Breads", "veg", 240, 8, ["gluten"], ["wheat flour", "salt"], ["hot"], "mild", THALI2, 8, None),
        ("Jeera Rice", "Basmati tossed in ghee and toasted cumin", 129, "Rice", "veg", 380, 7, [], ["basmati", "cumin", "ghee"], ["hot"], "mild", RICE_VEG, 12, None),
        ("Gulab Jamun (2 pcs)", "Khoya dumplings soaked in cardamom syrup", 99, "Dessert", "veg", 320, 4, ["dairy", "gluten"], ["khoya", "sugar", "cardamom", "rose water"], ["sweet"], "mild", CAKE1, 5, (99, 59, 8)),
        ("Masala Chaas", "Spiced buttermilk with roasted cumin and mint", 59, "Beverage", "veg", 90, 3, ["dairy"], ["curd", "cumin", "mint", "black salt"], ["cold", "light"], "mild", SALAD5, 3, None),
        ("Veg Kolhapuri", "Garden vegetables in a fiery Kolhapuri masala", 229, "Main Course", "veg", 540, 14, ["groundnut"], ["mixed vegetables", "kolhapuri masala", "coconut"], ["fiery", "hot"], "fiery", SILVER_PLATE, 20, None),
    ],
    "dilli": [
        ("Hyderabadi Chicken Dum Biryani", "Sealed-handi biryani with saffron, mint and fried onions", 329, "Biryani", "nonveg", 780, 38, ["dairy"], ["aged basmati", "chicken", "saffron", "fried onion", "yogurt"], ["hot", "comfort", "protein-rich"], "fiery", BIRYANI_PLATE, 28, None),
        ("Mutton Rogan Josh", "Kashmiri slow-cooked mutton in aromatic red gravy", 389, "Main Course", "nonveg", 720, 36, ["dairy"], ["mutton", "kashmiri chilli", "yogurt", "fennel"], ["hot", "protein-rich"], "fiery", RICE_MEAT, 30, None),
        ("Paneer Tikka Biryani", "Charred paneer tikka layered with saffron rice", 279, "Biryani", "veg", 700, 24, ["dairy"], ["basmati", "paneer", "mint", "saffron"], ["hot"], "medium", BIRYANI2, 25, None),
        ("Egg Biryani", "Masala-boiled eggs tucked into spiced dum rice", 239, "Biryani", "egg", 660, 28, ["egg"], ["basmati", "egg", "biriyani masala", "ghee"], ["hot", "protein-rich"], "medium", BOWL_RICE, 22, (239, 149, 4)),
        ("Butter Naan", "Pillowy naan brushed with white butter", 59, "Breads", "veg", 260, 6, ["gluten", "dairy"], ["wheat flour", "butter", "yeast"], [], "mild", THALI2, 8, None),
        ("Mirchi Ka Salan", "Hyderabadi chilli-peanut curry, the classic biryani side", 149, "Sides", "veg", 210, 4, ["groundnut", "sesame"], ["banana chilli", "peanut", "tamarind", "sesame"], ["fiery"], "fiery", STEEL_TRAY, 15, None),
        ("Phirni", "Slow-cooked rice pudding with saffron and almonds", 109, "Dessert", "veg", 290, 6, ["dairy", "nuts"], ["ground rice", "milk", "saffron", "almond"], ["sweet", "cold"], "mild", CAKE2, 5, (109, 69, 6)),
        ("Double Ka Meetha", "Hyderabadi fried-bread pudding with cashew", 129, "Dessert", "veg", 410, 7, ["dairy", "gluten", "nuts"], ["bread", "milk", "sugar", "cashew", "ghee"], ["sweet"], "mild", PASTRY, 8, None),
    ],
    "pizza": [
        ("Margherita Classica", "San Marzano tomato, fior di latte, basil on sourdough", 249, "Pizza", "veg", 680, 24, ["dairy", "gluten"], ["sourdough base", "fior di latte", "san marzano tomato", "basil"], ["comfort"], "mild", PIZZA_WOOD, 18, (249, 179, 3)),
        ("Peri Peri Paneer Pizza", "Peri-peri paneer, charred capsicum and mozzarella", 319, "Pizza", "veg", 760, 27, ["dairy", "gluten"], ["paneer", "peri peri sauce", "mozzarella", "capsicum"], ["fiery", "hot"], "fiery", PIZZA_OVEN, 20, None),
        ("Chicken Pepperoni Feast", "Double chicken pepperoni with oregano and chilli flakes", 389, "Pizza", "nonveg", 890, 40, ["dairy", "gluten"], ["chicken pepperoni", "mozzarella", "oregano", "tomato"], ["comfort", "protein-rich"], "medium", PIZZA_PLATE, 20, None),
        ("Pesto Veggie Wood-Fired", "Basil pesto, bell peppers, olives and feta", 299, "Pizza", "veg", 710, 22, ["dairy", "gluten", "nuts"], ["pesto", "bell pepper", "olives", "mozzarella", "walnut"], ["hot"], "mild", PIZZA_OVEN2, 18, None),
        ("Garlic Bread Sticks", "Stone-baked sticks with garlic butter and cheese", 149, "Sides", "veg", 420, 9, ["gluten", "dairy"], ["wheat flour", "garlic butter", "mozzarella"], ["comfort"], "mild", COMBO, 8, (149, 89, 7)),
        ("Walnut Brownie Sundae", "Warm brownie, vanilla bean ice cream, toasted walnut", 179, "Dessert", "veg", 540, 8, ["dairy", "gluten", "nuts"], ["brownie", "vanilla ice cream", "walnut", "chocolate"], ["sweet", "cold"], "mild", CAKE3, 5, None),
        ("Garden Side Salad", "Cucumber, cherry tomato, greens with lemon vinaigrette", 119, "Salad", "veg", 160, 5, [], ["cucumber", "cherry tomato", "mixed greens", "olive oil"], ["light", "fresh"], "mild", SALAD4, 6, None),
    ],
    "bao": [
        ("Steamed Chicken Bao (2 pcs)", "Hand-pleated baos with hoisin chicken and scallion", 189, "Bao", "nonveg", 460, 26, ["gluten", "soy"], ["chicken", "bao flour", "scallion", "hoisin"], ["comfort"], "medium", DUMPLINGS, 12, None),
        ("Veg Shiitake Bao (2 pcs)", "Shiitake, cabbage and spring onion in soft bao", 169, "Bao", "veg", 420, 14, ["gluten", "soy"], ["shiitake", "cabbage", "bao flour", "spring onion"], ["light"], "mild", DUMPLINGS, 12, None),
        ("Chilli Garlic Noodles", "Wok-tossed noodles with garlic and dry chilli", 209, "Noodles", "veg", 640, 16, ["gluten", "soy"], ["noodles", "garlic", "dry chilli", "spring onion"], ["fiery", "hot"], "fiery", FRIED_RICE, 14, None),
        ("Kung Pao Tofu Bowl", "Crispy tofu, peanuts and sichuan pepper over rice", 249, "Bowl", "veg", 560, 24, ["soy", "nuts"], ["tofu", "peanut", "sichuan pepper", "jasmine rice"], ["protein-rich", "hot"], "fiery", SALAD2, 16, None),
        ("Teriyaki Chicken Rice Bowl", "Grilled chicken glazed in house teriyaki", 289, "Bowl", "nonveg", 690, 34, ["soy", "sesame"], ["chicken", "teriyaki", "rice", "sesame"], ["protein-rich", "comfort"], "medium", BOWL_RICE, 16, (289, 199, 2)),
        ("Matcha Mochi Cake", "Chewy matcha layers with whipped cream", 149, "Dessert", "veg", 330, 5, ["gluten", "dairy"], ["matcha", "mochi rice", "cream"], ["sweet"], "mild", CAKE3, 5, None),
        ("Hot & Sour Soup", "Peppery mushroom-tofu soup, street-style", 129, "Soups", "veg", 180, 6, ["soy"], ["mushroom", "vinegar", "white pepper", "tofu"], ["hot", "soup", "light"], "medium", STEEL_TRAY, 10, (129, 79, 5)),
    ],
    "green": [
        ("Rainbow Harvest Salad Bowl", "Avocado, chickpea, beetroot and feta on greens", 249, "Salad", "veg", 320, 12, ["dairy"], ["avocado", "chickpea", "beetroot", "feta", "greens"], ["light", "fresh"], "mild", SALAD1, 8, None),
        ("Grilled Paneer Protein Bowl", "Charred paneer, quinoa and roast vegetables", 289, "Bowl", "veg", 480, 32, ["dairy"], ["paneer", "quinoa", "broccoli", "bell pepper"], ["protein-rich", "light"], "mild", SALAD6, 12, None),
        ("Vegan Buddha Bowl", "Tofu, brown rice, kale and tahini drizzle", 259, "Bowl", "veg", 440, 18, ["soy"], ["tofu", "brown rice", "kale", "tahini"], ["light", "fresh"], "mild", SALAD2, 10, None),
        ("Sourdough Veggie Sandwich", "Grilled sourdough, herb cheese and market vegetables", 189, "Sandwich", "veg", 410, 14, ["gluten", "dairy"], ["sourdough", "herb cheese", "vegetables"], ["light"], "mild", COMBO, 8, None),
        ("Cold Pressed Greens Juice", "Spinach, cucumber, apple and ginger", 119, "Beverage", "veg", 120, 3, [], ["spinach", "cucumber", "apple", "ginger"], ["cold", "light"], "mild", SALAD5, 4, None),
        ("Greek Feta Salad", "Cucumber, olives and feta with oregano dressing", 229, "Salad", "veg", 350, 11, ["dairy"], ["cucumber", "olives", "feta", "tomato", "oregano"], ["light", "fresh"], "mild", SALAD3, 7, (229, 139, 4)),
        ("Dark Cacao Energy Balls", "Date-almond-cacao bites, no refined sugar", 99, "Dessert", "veg", 210, 6, ["nuts"], ["dates", "almond", "cacao"], ["sweet"], "mild", CUPCAKES, 3, (99, 59, 9)),
        ("Farm Egg Power Bowl", "Poached eggs, heirloom tomato and sourdough crumble", 239, "Bowl", "egg", 420, 24, ["egg", "gluten"], ["egg", "heirloom tomato", "sourdough", "greens"], ["protein-rich"], "mild", EGG_BOWL, 10, None),
    ],
    "chaat": [
        ("Vada Pav (2 pcs)", "Bombay's legendary potato vada in buttered pav", 89, "Street", "veg", 480, 10, ["gluten"], ["potato", "pav", "garlic chutney", "besan"], ["comfort", "snack", "fried"], "medium", FEAST, 6, None),
        ("Sev Puri", "Crisp papdi, sev, tamarind and potato bites", 99, "Street", "veg", 380, 8, ["gluten", "nuts"], ["papdi", "sev", "tamarind", "potato"], ["snack", "light"], "mild", FEAST, 6, None),
        ("Paneer Tikka Grilled Sandwich", "Masala paneer and cheese, grilled to order", 149, "Street", "veg", 520, 18, ["dairy", "gluten"], ["paneer", "bread", "mint chutney", "cheese"], ["snack", "comfort"], "medium", COMBO, 9, None),
        ("Tandoori Veg Grilled Sandwich", "Tandoori vegetables with molten cheese", 139, "Street", "veg", 490, 14, ["dairy", "gluten"], ["vegetables", "bread", "cheese", "tandoori mayo"], ["snack"], "medium", COMBO, 8, None),
        ("Masala Chai", "Cutting chai with ginger and cardamom", 49, "Beverage", "veg", 80, 2, ["dairy"], ["tea", "ginger", "cardamom", "milk"], ["hot", "beverage"], "mild", CAKE2, 4, None),
        ("Pav Bhaji", "Buttery mashed veg bhaji with toasted pav", 159, "Street", "veg", 610, 12, ["dairy", "gluten"], ["mixed vegetables", "butter", "pav", "onion"], ["comfort", "hot"], "medium", FEAST, 10, (159, 99, 6)),
        ("Cheesy Corn Toast", "Sweet corn and cheese on garlic toast", 119, "Street", "veg", 430, 12, ["dairy", "gluten"], ["sweet corn", "cheese", "bread", "herbs"], ["snack"], "mild", COMBO, 7, (119, 69, 4)),
    ],
}

USERS = [
    {"name": "Ananya Rao", "email": "admin@smartbite.in", "role": "admin", "phone": "+91 98860 10001"},
    {"name": "Aarav Sharma", "email": "customer@smartbite.in", "role": "customer", "phone": "+91 98860 10002",
     "address": "412, 12th Main Road, Indiranagar, Bengaluru",
     "prefs": {"dietary": ["veg"], "cuisines": ["North Indian", "Biryani"], "calorie_cap": 800}},
    {"name": "Priya Nair", "email": "priya@smartbite.in", "role": "customer", "phone": "+91 98860 10003",
     "address": "77, Garden Apartments, Koramangala, Bengaluru",
     "prefs": {"dietary": [], "cuisines": ["Asian", "Healthy"], "calorie_cap": 600}},
    {"name": "Rohan Mehta", "email": "owner@smartbite.in", "role": "restaurant", "phone": "+91 98860 10004"},
    {"name": "Vikram Singh", "email": "rider@smartbite.in", "role": "delivery", "phone": "+91 98860 10005",
     "vehicle": "Bike"},
    {"name": "Meera Iyer", "email": "meera@smartbite.in", "role": "delivery", "phone": "+91 98860 10006",
     "vehicle": "EV Scooter"},
]


def menu_docs(rest_key: str, rest_id: str):
    docs = []
    for (name, desc, price, cat, diet, cal, protein, allergens, ingredients, tags, spice, img, prep, surplus) in MENU[rest_key]:
        doc = {
            "id": f"{rest_key}-{name.lower().replace(' ', '-').replace('(', '').replace(')', '').replace('.', '')[:24]}-{random.randint(1000, 9999)}",
            "restaurant_id": rest_id, "name": name, "description": desc, "price": float(price),
            "image_url": img, "category": cat, "diet": diet, "calories": cal, "protein": protein,
            "carbs": int(cal * 0.45 / 4), "fats": int(cal * 0.3 / 9),
            "allergens": allergens, "ingredients": ingredients, "spice": spice,
            "customisable": cat in ("Main Course", "Bowl", "Thali", "Biryani", "Pizza"),
            "is_available": True, "is_surplus": False, "original_price": None, "surplus_qty": 0,
            "prep_mins": prep, "orders_count": random.randint(120, 480),
            "tags": tags, "rating": round(random.uniform(4.0, 4.9), 1),
        }
        if surplus:
            orig, sale, qty = surplus
            doc.update({"is_surplus": True, "original_price": float(orig), "price": float(sale), "surplus_qty": qty})
        docs.append(doc)
    return docs


async def make_order(customer: dict, rest: dict, items: list, placed_at: datetime, delivered=True,
                     batching=False, payment="upi", partner=None, status="delivered"):
    lines = [{"item_id": it["id"], "name": it["name"], "price": it["price"], "qty": q,
              "diet": it["diet"], "image_url": it["image_url"]} for it, q in items]
    subtotal = round(sum(it["price"] * q for it, q in items), 2)
    packaging, delivery, gst, batch_disc, total = compute_breakdown(subtotal, rest["delivery_fee"], batching)
    o = {
        "id": f"seed-{rest['id']}-{customer['email'].split('@')[0]}-{int(placed_at.timestamp())}-{random.randint(100, 999)}",
        "customer_id": customer["id"], "customer_name": customer["name"],
        "restaurant_id": rest["id"], "restaurant_name": rest["name"],
        "items": lines, "address": customer.get("address", ""), "status": status,
        "subtotal": subtotal, "packaging_fee": packaging, "delivery_fee": delivery,
        "platform_fee": 6.0, "gst": gst, "batching_discount": batch_disc, "total": total,
        "payment_method": payment, "payment_status": "cash_on_delivery" if payment == "cod" else "paid",
        "batching": batching, "group_id": None, "group_code": None, "scheduled_for": None,
        "prep_mins": rest["prep_time_mins"], "eta_mins": rest["prep_time_mins"] + 18,
        "partner_id": partner["id"] if partner else None,
        "partner_name": partner["name"] if partner else None,
        "pickup_pin": f"{random.randint(1000, 9999)}",
        "payout": round(delivery * 0.8 + (20 if batching else 0), 2),
        "placed_at": placed_at,
        "accepted_at": placed_at + timedelta(minutes=2),
        "preparing_at": placed_at + timedelta(minutes=5),
        "ready_at": placed_at + timedelta(minutes=rest["prep_time_mins"]),
        "picked_at": placed_at + timedelta(minutes=rest["prep_time_mins"] + 6),
        "delivered_at": placed_at + timedelta(minutes=rest["prep_time_mins"] + 20),
        "cancelled_at": None,
    }
    if status == "placed":
        for k in ("accepted_at", "preparing_at", "ready_at", "picked_at", "delivered_at"):
            o[k] = None
    elif status == "accepted":
        for k in ("preparing_at", "ready_at", "picked_at", "delivered_at"):
            o[k] = None
    elif status == "preparing":
        for k in ("ready_at", "picked_at", "delivered_at"):
            o[k] = None
    elif status == "ready":
        for k in ("picked_at", "delivered_at"):
            o[k] = None
    elif status == "picked":
        o["delivered_at"] = None
    return o


async def main():
    count = await db.users.count_documents({})
    if count > 0:
        print(f"Seed skipped — {count} users already exist")
        return

    print("Seeding SmartBite…")
    password_hash = hash_password(PASSWORD)
    user_docs = {}
    for u in USERS:
        doc = {
            "id": f"user-{u['email'].split('@')[0]}", "name": u["name"], "email": u["email"],
            "password_hash": password_hash, "role": u["role"], "phone": u.get("phone", ""),
            "address": u.get("address", ""), "prefs": u.get("prefs", {"dietary": [], "cuisines": [], "calorie_cap": None}),
            "vehicle": u.get("vehicle", ""), "is_active": True,
            "created_at": NOW - timedelta(days=90),
        }
        user_docs[u["email"]] = doc
    await db.users.insert_many(list(user_docs.values()))
    aarav = user_docs["customer@smartbite.in"]
    priya = user_docs["priya@smartbite.in"]
    vikram = user_docs["rider@smartbite.in"]
    meera = user_docs["meera@smartbite.in"]
    owner = user_docs["owner@smartbite.in"]

    rest_docs, menus = [], {}
    for r in RESTAURANTS:
        doc = {k: v for k, v in r.items() if k != "key"}
        doc.update({"id": f"rest-{r['key']}", "owner_id": owner["id"],
                    "address": f"{doc['area']}, Bengaluru", "created_at": NOW - timedelta(days=80)})
        rest_docs.append(doc)
        menus[r["key"]] = menu_docs(r["key"], doc["id"])
    await db.restaurants.insert_many(rest_docs)
    for key, items in menus.items():
        await db.menu_items.insert_many(items)

    orders = []
    customers = [aarav, priya]
    partners = [vikram, meera]
    payments = ["upi", "upi", "card", "cod", "wallet"]
    random.seed(42)
    for day in range(7, 0, -1):
        for r in RESTAURANTS:
            rest = next(d for d in rest_docs if d["id"] == f"rest-{r['key']}")
            for n in range(random.randint(3, 4)):
                cust = random.choice(customers)
                pool = menus[r["key"]]
                picks = random.sample(pool, k=random.randint(1, 3))
                items = [(p, random.randint(1, 2)) for p in picks]
                placed = NOW - timedelta(days=day, hours=random.randint(0, 6), minutes=random.randint(0, 50))
                orders.append(await make_order(cust, rest, items, placed, delivered=True,
                                               batching=random.random() < 0.3,
                                               payment=random.choice(payments),
                                               partner=random.choice(partners)))
    # Live orders for today's demo (Aarav)
    saffron = next(d for d in rest_docs if d["id"] == "rest-saffron")
    pizza = next(d for d in rest_docs if d["id"] == "rest-pizza")
    dilli = next(d for d in rest_docs if d["id"] == "rest-dilli")
    bao = next(d for d in rest_docs if d["id"] == "rest-bao")
    t = NOW
    orders.append(await make_order(aarav, saffron, [(menus["saffron"][0], 1), (menus["saffron"][5], 2)], t - timedelta(minutes=3), status="placed"))
    orders.append(await make_order(aarav, pizza, [(menus["pizza"][2], 1)], t - timedelta(minutes=12), status="accepted"))
    orders.append(await make_order(priya, dilli, [(menus["dilli"][0], 2), (menus["dilli"][4], 2)], t - timedelta(minutes=28), status="ready", batching=True))
    orders.append(await make_order(aarav, bao, [(menus["bao"][4], 1), (menus["bao"][6], 1)], t - timedelta(minutes=41), status="picked", partner=vikram))
    orders.append(await make_order(aarav, saffron, [(menus["saffron"][2], 1)], t - timedelta(hours=5), status="delivered", partner=vikram))

    await db.orders.insert_many(orders)

    await db.reviews.insert_many([
        {"id": "rev-1", "order_id": orders[-1]["id"], "customer_id": aarav["id"], "customer_name": aarav["name"],
         "restaurant_id": saffron["id"], "rating": 5, "comment": "Butter chicken was outstanding, arrived hot!",
         "created_at": t - timedelta(hours=4)},
        {"id": "rev-2", "order_id": "seed-dilli-priya-1", "customer_id": priya["id"], "customer_name": priya["name"],
         "restaurant_id": "rest-dilli", "rating": 5, "comment": "Best dum biryani in Koramangala.",
         "created_at": t - timedelta(days=2)},
        {"id": "rev-3", "order_id": "seed-green-aarav-2", "customer_id": aarav["id"], "customer_name": aarav["name"],
         "restaurant_id": "rest-green", "rating": 4, "comment": "Protein bowl was fresh and filling.",
         "created_at": t - timedelta(days=3)},
        {"id": "rev-4", "order_id": "seed-pizza-priya-2", "customer_id": priya["id"], "customer_name": priya["name"],
         "restaurant_id": "rest-pizza", "rating": 4, "comment": "Crust was perfect, delivery took a while.",
         "created_at": t - timedelta(days=4)},
    ])
    for rid, agg in {
        "rest-saffron": (4.6, 1240), "rest-dilli": (4.7, 2130), "rest-pizza": (4.5, 980),
        "rest-bao": (4.4, 760), "rest-green": (4.6, 640), "rest-chaat": (4.3, 1520),
    }.items():
        await db.restaurants.update_one({"id": rid}, {"$set": {"rating": agg[0], "rating_count": agg[1]}})

    await db.complaints.insert_many([
        {"id": "cmp-1", "order_id": orders[-2]["id"], "customer_id": priya["id"], "customer_name": priya["name"],
         "subject": "Missing naan in delivery", "message": "Ordered 2 butter naan but received only one.",
         "status": "open", "resolution": "", "created_at": t - timedelta(hours=3)},
        {"id": "cmp-2", "order_id": "seed-pizza-priya-2", "customer_id": priya["id"], "customer_name": priya["name"],
         "subject": "Late delivery", "message": "Order arrived 25 minutes after ETA.",
         "status": "resolved", "resolution": "Full delivery fee refunded as SmartBite wallet cashback.",
         "created_at": t - timedelta(days=4)},
    ])

    await db.donations.insert_many([
        {"id": "don-1", "restaurant_id": "rest-saffron", "restaurant_name": "Saffron & Spice Kitchen",
         "ngo_name": "Feeding India", "meals": 15, "status": "collected", "created_at": t - timedelta(days=1)},
        {"id": "don-2", "restaurant_id": "rest-dilli", "restaurant_name": "Dilli Darbar Biryani House",
         "ngo_name": "Robin Hood Army", "meals": 12, "status": "collected", "created_at": t - timedelta(days=2)},
        {"id": "don-3", "restaurant_id": "rest-green", "restaurant_name": "Green Harvest Deli",
         "ngo_name": "Annamrita Foundation", "meals": 10, "status": "requested", "created_at": t - timedelta(hours=2)},
    ])

    await db.subscriptions.insert_many([
        {"id": "sub-1", "user_id": aarav["id"], "restaurant_id": "rest-green", "restaurant_name": "Green Harvest Deli",
         "meal": "lunch", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "price_per_meal": 129.0,
         "status": "active", "started_at": t - timedelta(days=6)},
        {"id": "sub-2", "user_id": priya["id"], "restaurant_id": "rest-bao", "restaurant_name": "Bao & Bowl Co.",
         "meal": "dinner", "days": ["Tue", "Thu"], "price_per_meal": 159.0,
         "status": "paused", "started_at": t - timedelta(days=10)},
    ])

    group = {
        "id": "group-demo-1", "code": "482913", "host_id": aarav["id"], "host_name": aarav["name"],
        "restaurant_id": "rest-pizza", "restaurant_name": "Artisan Crust Pizza Lab", "status": "open",
        "members": [
            {"user_id": aarav["id"], "name": aarav["name"],
             "items": [{"item_id": menus["pizza"][0]["id"], "name": "Margherita Classica", "price": 179.0, "qty": 1, "diet": "veg"}],
             "total": 179.0},
        ],
        "order_id": None, "created_at": t - timedelta(minutes=15),
    }
    await db.group_orders.insert_one(group)

    await ensure_indexes()
    print(f"Done: {len(rest_docs)} restaurants, {sum(len(v) for v in menus.values())} menu items, "
          f"{len(orders)} orders, 6 users. Password for every demo account: {PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
    client.close()
