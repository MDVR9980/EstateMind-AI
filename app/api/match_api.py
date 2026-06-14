from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.core.database import get_session
from app.core.models import Client, Property
from app.services.vector_db import search_best_matches_semantic

router = APIRouter(prefix="/api/match", tags=["Matching"])

@router.get("/client/{client_id}")
def match_for_client(client_id: int, session: Session = Depends(get_session)):
    client = session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="مشتری یافت نشد")
    
    # ساختن جمله نیازمندی مشتری برای هوش مصنوعی
    deal_fa = "خرید" if client.deal_type_requested == "SALE" else ("رهن و اجاره" if client.deal_type_requested == "RENT" else "مشارکت")
    query = f"مشتری به دنبال {deal_fa} ملک با بودجه حدود {client.budget_limit} تومان است."
    
    try:
        # جستجو در مغز ChromaDB
        results = search_best_matches_semantic(query, n_results=3)
        
        matched_properties = []
        if results and results['ids'] and len(results['ids'][0]) > 0:
            for idx, prop_id_str in enumerate(results['ids'][0]):
                prop = session.get(Property, int(prop_id_str))
                if prop and prop.status == "active":
                    # محاسبه درصد تطابق فرضی بر اساس فاصله معنایی
                    distance = results['distances'][0][idx]
                    match_score = max(10, 100 - int(distance * 50)) 
                    
                    matched_properties.append({
                        "id": prop.id,
                        "title": prop.title,
                        "price": prop.price_total,
                        "score": match_score
                    })
        
        return {"status": "success", "matches": matched_properties}
    except Exception as e:
        print(f"❌ Matching Error: {e}")
        raise HTTPException(status_code=500, detail="خطا در موتور جستجوی معنایی")