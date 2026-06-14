import chromadb
from chromadb.utils import embedding_functions

chroma_client = chromadb.PersistentClient(path="./chroma_db")

sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="paraphrase-multilingual-MiniLM-L12-v2"
)

properties_collection = chroma_client.get_or_create_collection(
    name="real_estate_properties",
    embedding_function=sentence_transformer_ef
)

def add_property_to_vector_db(property_id: int, title: str, description: str, prop_type: str, deal_type: str, neighborhood: str, price: float):
    """تبدیل مشخصات ملک به بردار (Vector) و ذخیره آن"""
    full_text = f"ملک {prop_type} برای {deal_type} در محله {neighborhood}. با قیمت {price} تومان. عنوان: {title}. توضیحات تکمیلی: {description}"
    
    properties_collection.add(
        documents=[full_text],
        metadatas=[{"property_id": property_id, "title": title, "neighborhood": neighborhood}],
        ids=[str(property_id)]
    )
    print(f"🧠 [Vector DB]: ملک شماره {property_id} به فضای برداری Chroma اضافه شد.")

def search_best_matches_semantic(query_text: str, n_results: int = 3):
    """جستجوی نزدیک‌ترین فایل‌ها به نیاز مشتری (بر اساس فاصله کسینوسی)"""
    results = properties_collection.query(
        query_texts=[query_text],
        n_results=n_results
    )
    return results