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
1. SECRET_KEY=
2. ADMIN_EMAIL=
3. ADMIN_PASSWORD=
4. NEWS_API_KEY=
5. MAIL_USERNAME=
6. MAIL_PASSWORD=

## Database
SQLite database auto-created on first run via schema.sql

## Screenshots

### Home Page
<img width="625" height="340" alt="image" src="https://github.com/user-attachments/assets/93b93966-d959-4a7b-9ac4-498fffd09ca5" />
<img width="626" height="385" alt="image" src="https://github.com/user-attachments/assets/189d07c1-1f34-4d41-8979-b6d4789276c9" />

### Login/Register Page
<img width="650" height="312" alt="image" src="https://github.com/user-attachments/assets/34baa2a0-0100-434f-8747-1bff1d21eeb6" />
<img width="650" height="318" alt="image" src="https://github.com/user-attachments/assets/23136bd1-4e0d-4247-9744-ab5f25c2cb02" />

### Scan Page
<img width="623" height="314" alt="image" src="https://github.com/user-attachments/assets/dfbeca41-ed3e-4c30-af41-b3cc13a1e701" />

### Dashboard Page
<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/2456dc98-21ea-49da-8714-a9e9edfe29e3" />
<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/d52c0040-0e48-461e-bf9c-8571a1638063" />

### Awareness Page
<img width="618" height="309" alt="image" src="https://github.com/user-attachments/assets/69fa9f11-706f-4a47-97a3-04342f3112db" />
<img width="623" height="257" alt="image" src="https://github.com/user-attachments/assets/4491694b-5057-4468-afee-9cc64babdb57" />

### Contact Page
<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/c4120fc4-4a28-42d4-a195-3c16fa8cd1b2" />

### Admin Panel
<img width="617" height="335" alt="image" src="https://github.com/user-attachments/assets/b063eb2d-970c-4c00-86c0-0dc1ccb5f51c" />

## Team
Kiran & Tanisha
