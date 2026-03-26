from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from entities.DocumentStore import DocumentOwnerType, DocumentCategory


class DocumentResponse(BaseModel):
    id: UUID
    owner_id: UUID
    owner_type: DocumentOwnerType
    category: DocumentCategory
    title: str
    description: Optional[str] = None
    file_name: str
    mime_type: Optional[str] = None
    file_size_bytes: Optional[str] = None
    prescription_id: Optional[UUID] = None
    uploaded_at: datetime

    model_config = {"from_attributes": True}
