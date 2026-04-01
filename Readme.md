Tender Compliance Backend

This project provides a complete Node.js backend for file upload and metadata storage using MongoDB.

Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Multer for file uploads
- CORS and dotenv

Setup

1. Install dependencies:
   npm install
2. Make sure MongoDB is running locally.
3. Verify environment variables in .env:
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/tender_system
4. Start the server:
   npm start

Base URL
http://localhost:5000

Endpoints

- GET /api/health
  Returns server status.

- POST /api/files/upload
  Upload a single file using multipart/form-data.
  Form field name: file
  Optional text fields: title, description

- GET /api/files
  Fetch all uploaded file records.

- GET /api/files/:id
  Fetch a single file record by ID.

- DELETE /api/files/:id
  Delete file record from MongoDB and remove physical file from disk.

Uploaded Files

- Files are stored in the uploads folder.
- Files are served publicly at /uploads/<stored-file-name>.
