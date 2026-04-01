from pydantic import BaseModel

class ExtractTextResponse(BaseModel):
	filename: str
	extracted_text: str
	page_count: int
	status: str
