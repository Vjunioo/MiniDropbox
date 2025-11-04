import os
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from fastapi import FastAPI, UploadFile, File, HTTPException
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

# --- Configurações ---
DB_USER = os.getenv("DB_USER", "user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_HOST = os.getenv("DB_HOST", "db")
DB_NAME = os.getenv("DB_NAME", "minidropbox")

MINIO_URL = os.getenv("MINIO_URL", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = "dropbox-files"

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"

# --- Conexão com Banco de Dados (PostgreSQL) ---
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class FileMetadata(Base):
    __tablename__ = "files"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    object_name = Column(String, unique=True)

Base.metadata.create_all(bind=engine)

s3_client = boto3.client(
    's3',
    endpoint_url=f"http://{MINIO_URL}",
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    config=Config(signature_version='s3v4')
)

try:
    s3_client.head_bucket(Bucket=MINIO_BUCKET)
except ClientError:
    s3_client.create_bucket(Bucket=MINIO_BUCKET)


# --- Aplicação FastAPI ---
app = FastAPI()

@app.get("/api/")
def read_root():
    return {"message": "API do MiniDropbox no ar!", "hostname": os.getenv("HOSTNAME")}

@app.post("/api/upload/")
async def upload_file(file: UploadFile = File(...)):
    db = SessionLocal()
    try:
        object_name = f"file-{file.filename}-{os.urandom(4).hex()}"
        
        
        s3_client.upload_fileobj(file.file, MINIO_BUCKET, object_name)

        
        db_file = FileMetadata(filename=file.filename, object_name=object_name)
        db.add(db_file)
        db.commit()
        db.refresh(db_file)

        return {"id": db_file.id, "filename": db_file.filename, "object_name": db_file.object_name}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro no upload: {str(e)}")
    finally:
        db.close()

@app.get("/api/files/")
async def list_files():
    db = SessionLocal()
    files = db.query(FileMetadata).all()
    db.close()
    return files

@app.get("/api/download/{file_id}")
async def get_download_link(file_id: int):
    db = SessionLocal()
    db_file = db.query(FileMetadata).filter(FileMetadata.id == file_id).first()
    db.close()

    if db_file is None:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")

    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': MINIO_BUCKET, 
                'Key': db_file.object_name,
                'ResponseContentDisposition': 'inline'
            },
            ExpiresIn=3600
        )
        
        return {"download_url": url}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar link: {str(e)}")