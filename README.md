# Matchr

## Overview

Matchr is an AI-powered CV parsing and candidate matching platform developed as my senior university project.

The system allows candidates to upload CVs in PDF or DOCX format, converts the documents into editable structured profiles using Google Gemini, and enables recruiters to rank anonymised candidates against defined job requirements.

## Live Application

[Open Matchr](https://zaabiman-jpg.github.io/Matchr/)

> The backend is hosted on Render's free tier and may require a short cold-start period.

## Architecture

Candidate Browser  
→ GitHub Pages Frontend  
→ Flask API on Render  
→ Google Gemini API  
→ Firebase Authentication and Firestore

## Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Python
- Flask
- pdfplumber
- python-docx

### AI and Data
- Google Gemini 2.5 Flash
- Firebase Authentication
- Cloud Firestore

### Deployment
- GitHub Pages
- Render

## Key Features

- PDF and DOCX CV upload
- AI-powered structured data extraction
- Editable candidate profiles
- Candidate and recruiter accounts
- Job creation and application workflows
- Anonymous initial candidate screening
- Explainable weighted matching
- Candidate shortlisting
- Role-based Firestore access

## Security Measures

- File-extension allowlisting
- 5 MB upload limit
- Magic-byte file validation
- UUID-based temporary filenames
- Prompt-injection pattern sanitisation
- Server-side API credentials
- Temporary-file deletion after processing
- Role-based database access

## Matching Algorithm

The final score is calculated using:

- Skills match: 70%
- Experience: 20%
- Profile completeness: 10%

## Project Repositories

- [Frontend](https://github.com/zaabiman-jpg/Matchr)
- [Backend API](https://github.com/zaabiman-jpg/Matchr-API)

## What I Learned

This project taught me how to integrate an AI model into a complete web application while balancing security, explainability, infrastructure limitations and user experience.

One major technical decision involved replacing Sentence-BERT with a lightweight weighted matching algorithm because the embedding model exceeded the memory available on the free deployment tier. This demonstrated the importance of adapting system architecture to real deployment constraints.

## Future Improvements

- Replace exact skill matching with lightweight semantic similarity
- Add OCR support for scanned CVs
- Improve multilingual CV handling
- Add automated testing
- Add recruiter analytics
- Strengthen monitoring and rate limiting

## Team

Developed by Abdulla Alzaabi and Tahnoon Alzaabi as a Zayed University senior project.
