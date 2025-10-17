# Medical Report Analyzer - Single File Upload Feature

## Overview

The Medical Report Analyzer feature allows users to upload **one medical report at a time**. When a new report is uploaded, it automatically replaces the previous one. All extracted data and AI analysis are stored in Firestore and accessible to the user until they upload a new report.

## Architecture

### Backend Components

1. **Medical Report Service** (`server/src/services/medicalReportService.js`)

   - Handles CRUD operations for medical reports in Firestore
   - Enforces single-report-per-user policy
   - Manages file cleanup when reports are replaced

2. **Upload Routes** (`server/src/routes/upload.js`)

   - `POST /api/upload/report` - Upload new report (replaces existing)
   - `GET /api/upload/user/:userId/report` - Get current report
   - `GET /api/upload/user/:userId/has-report` - Check if user has a report
   - `DELETE /api/upload/user/:userId/report` - Delete current report

3. **Firebase Configuration** (`server/src/config/firebase.js`)
   - Server-side Firebase initialization for Firestore operations

### Frontend Components

1. **ReportsPage** (`client/src/pages/ReportsPage.jsx`)

   - Main page for report management
   - Loads existing report on mount
   - Shows current report info with replace/delete options

2. **FileUpload** (`client/src/components/files/FileUpload.jsx`)

   - File upload component with progress tracking
   - Supports PDF, DOCX, JPEG, JPG, PNG (max 10MB)

3. **ReportAnalysis** (`client/src/components/files/ReportAnalysis.jsx`)
   - Displays extracted lab values and AI analysis
   - Shows health insights and recommendations

### Database Structure

Firestore collection structure:

```
users/
  {userId}/
    medicalReport/
      current/              # Single document per user
        - userId
        - filename
        - reportType
        - extractedText
        - labValues
        - analysis
        - uploadedAt
        - fileMetadata
```

## Features

### 1. Single File Policy

- Users can only have one medical report at a time
- Uploading a new report automatically deletes the previous one
- Prevents data clutter and confusion

### 2. Data Persistence

- All extracted data stored in Firestore
- Lab values and analysis accessible across sessions
- No data loss between app visits

### 3. AI Analysis

- Automatic text extraction (OCR for images)
- Lab value parsing with reference ranges
- AI-powered health insights and recommendations
- PCOS-specific analysis

### 4. File Management

- Automatic cleanup of old files
- Temporary file storage during processing
- Secure file handling

## Usage

### For Users

1. **Upload Report**

   - Click "Upload New" button
   - Select file (PDF, DOCX, or image)
   - Wait for processing and analysis
   - View results immediately

2. **Replace Report**

   - Click "Replace Report" button
   - Upload new file
   - Previous report is automatically deleted
   - New analysis appears instantly

3. **Delete Report**
   - Click "Delete Report" button
   - Confirm deletion
   - Report and all data removed from database

### For Developers

#### Testing the Feature

1. Start the server:

```bash
cd server
npm run dev
```

2. Start the client:

```bash
cd client
npm run dev
```

3. Navigate to `/reports` page

4. Upload a medical report and verify:
   - File uploads successfully
   - Analysis appears
   - Data persists on page reload
   - Uploading new file replaces old one

#### Environment Variables

Server `.env` requires:

```env
# Firebase Configuration
FIREBASE_API_KEY="your_api_key"
FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
FIREBASE_PROJECT_ID="your_project_id"
FIREBASE_STORAGE_BUCKET="your_project.firebasestorage.app"
FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
FIREBASE_APP_ID="your_app_id"

# OpenAI for analysis
OPENAI_API_KEY="your_openai_key"
```

## API Reference

### Upload Report

```javascript
POST /api/upload/report

FormData:
- file: File (required)
- userId: string (required)
- reportType: string (default: 'lab')

Response:
{
  success: true,
  data: {
    reportId: 'current',
    filename: string,
    labValues: object,
    analysis: object,
    extractedText: string,
    uploadedAt: Date
  }
}
```

### Get Current Report

```javascript
GET /api/upload/user/:userId/report

Response:
{
  success: true,
  data: {
    id: 'current',
    filename: string,
    labValues: object,
    analysis: object,
    extractedText: string,
    uploadedAt: Timestamp,
    fileMetadata: object
  }
}
```

### Delete Report

```javascript
DELETE /api/upload/user/:userId/report

Response:
{
  success: true,
  message: 'Report deleted successfully'
}
```

## Security Considerations

1. **File Validation**

   - Only allowed file types accepted
   - File size limited to 10MB
   - MIME type verification

2. **User Authentication**

   - All endpoints require valid userId
   - Firebase authentication integration ready

3. **Data Privacy**
   - Medical data stored securely in Firestore
   - User-specific data isolation
   - No cross-user data access

## Future Enhancements

1. **Multi-Report History**

   - Option to enable report history
   - View previous reports with timestamps
   - Compare reports over time

2. **Enhanced Analysis**

   - Trend analysis across reports
   - Personalized recommendations
   - Integration with meal planning

3. **File Storage**

   - Move to Firebase Storage for scalability
   - Generate download links for original files
   - Thumbnail generation for image reports

4. **Notifications**
   - Email alerts for abnormal values
   - Reminders to upload new reports
   - Analysis completion notifications

## Troubleshooting

### Report Not Loading

- Check browser console for errors
- Verify Firebase configuration
- Ensure user is authenticated

### Upload Fails

- Check file size (max 10MB)
- Verify file type is supported
- Check server logs for errors
- Ensure OpenAI API key is valid

### Analysis Missing

- Verify report chain is initialized
- Check OpenAI API quota
- Review server logs for errors

## Support

For issues or questions:

1. Check server logs: `server/src/utils/logger.js`
2. Review Firestore console for data
3. Test API endpoints with Postman
4. Check browser console for client errors
