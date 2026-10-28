from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import os

from .config import load_env

load_env()

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:12345@localhost:5432/ieltsai"
)
 

engine = create_engine(
    DATABASE_URL,
    pool_size=10,           
    max_overflow=20,        
    pool_pre_ping=True,   
    echo=False              
)



SessionLocal = sessionmaker(
    autocommit=False,       
    autoflush=False,        
    bind=engine             
)


Base = declarative_base()


def get_db() -> Session:

    db = SessionLocal() 
    try:
        yield db         
    finally:
        db.close()      


def create_tables():
    
    from . import models 

    Base.metadata.create_all(bind=engine)


def drop_tables():
    """
    Drops all tables. USE WITH CAUTION!
    """
    Base.metadata.drop_all(bind=engine)
