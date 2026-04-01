from fastapi import UploadFile
from pydantic import BaseModel


class ExtractTextRequest(BaseModel):
    # Uploads are handled directly by endpoint params, this model is optional.
    file: UploadFile

    class Config:
        arbitrary_types_allowed = True
