"""Database setup.

Locally it uses a SQLite file (patients.db). In production set the
DATABASE_URL environment variable to a PostgreSQL connection string
(for example from Neon) so data survives server restarts and redeploys.
"""
import os

from sqlalchemy import Column, Date, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

LOCAL_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "patients.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{LOCAL_DB}")

# Some hosts give "postgres://", but SQLAlchemy expects "postgresql://".
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    ward = Column(String(50), nullable=False)
    department = Column(String(50), nullable=False)
    doctor = Column(String(50), nullable=False)
    admission_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="Admitted")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "ward": self.ward,
            "department": self.department,
            "doctor": self.doctor,
            "admission_date": self.admission_date.isoformat(),
            "status": self.status,
        }


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
