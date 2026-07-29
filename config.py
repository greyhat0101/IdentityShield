import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')

    # API KEYS
    NEWS_API_KEY = os.getenv('NEWS_API_KEY', '')
    XPOSEDORNOT_API = 'https://api.xposedornot.com/v1'

    #ADMIN CREDENTIALS
    ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@identityshield.com')
    ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')

    # MAIL CONFIGURATIONS
    MAIL_SERVER   = 'smtp.gmail.com'
    MAIL_PORT     = 587
    MAIL_USE_TLS  = True
    MAIL_USE_SSL  = False
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_USERNAME')
