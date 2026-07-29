# IdentityShield
A Flask-based Data Breach Detection and Cybersecurity Awareness platform that checks email exposure in known breaches, calculates risk scores, and provides cybersecurity news and security recommendations.

## Features
- Email breach detection
- Risk score calculation (0-100)
- Platform-specific scanning
- User dashboard with scan history
- Admin panel with analytics
- PDF report download
- Support ticket system
- Contact form with email replies

## Tech Stack
- Backend: Python Flask
- Database: SQLite
- Frontend: HTML, CSS, JavaScript, jQuery
- APIs: XposedOrNot, NewsAPI
- Email: Flask-Mail (Gmail SMTP)

## Setup Instructions
1. Clone the repository
2. Install dependencies:
   pip install -r requirements.txt
3. Create a .env file 
4. Run the application:
   python app.py
5. Open http://localhost:5000

## Environment Variables
Create a .env file with these variables:
SECRET_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD=
NEWS_API_KEY=
MAIL_USERNAME=
MAIL_PASSWORD=

## Database
SQLite database auto-created on first run via schema.sql

## Team
Kiran & Tanisha
