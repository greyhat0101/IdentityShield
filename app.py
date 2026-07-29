from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash, send_file
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3, requests, json, io
from datetime import datetime, timezone, timedelta
from config import Config
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from flask_mail import Mail, Message


app = Flask(__name__)

app.config.from_object(Config)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF Protection
app.config['SESSION_COOKIE_HTTPONLY'] = True  #XSS Protection (Javascript cannot read session cookie)
app.config['SESSION_COOKIE_SECURE'] = False #'True' for production
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=365)
mail = Mail(app)

DB = 'Database/identity_shield.db'

IST = timezone(timedelta(hours=5, minutes=30))

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    with open('Database/schema.sql') as f:
        conn.executescript(f.read())
        
    try:
        conn.execute("INSERT INTO users (username, email, password_hash, is_admin) VALUES (?,?,?,?)",
            ('admin', app.config['ADMIN_EMAIL'],
             generate_password_hash(app.config['ADMIN_PASSWORD']), 1))
        conn.commit()
        
    except : #sqlite3.IntegrityError
        pass

    conn.close()


#==================================================
        # COMMON ROUTES SECTION 
#==================================================
    
#-------------------------------------------------------------------------------------------------------------------------------------

@app.route('/')
def index():
    return render_template('index.html')


#-----------------------------------------------------------------------------------------------------------------------------------------

@app.route('/api/check-session')
def check_session():
    return jsonify({'logged_in': 'user_id' in session})


#----------------------------------------------------------------------------------------------------------------------------------------------

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # handle both JSON (modal) and form submission
        if request.is_json:
            data = request.get_json()
            email = data.get('email', '').strip()
            password = data.get('password', '')
            remember_me = data.get('remember_me', False)
        else:
            email = request.form['email']
            password = request.form['password']
            remember_me = request.form.get('remember_me', False)

        conn = get_db()
        user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        conn.close()

        if user is None:
            if request.is_json:
                return jsonify({
                    "success": False,
                    "error": "Email not registered. Please register first." }), 200

            flash("Email not registered. Please register first.")
            return redirect(url_for("register"))
                

        elif user and check_password_hash(user['password_hash'], password):
                if remember_me:
                    session.permanent = True
                else :
                    session.permanent = False
                    
                session['user_id'] = user['id']
                session['username'] = user['username']
                session['is_admin'] = user['is_admin']
                redirect_url = '/admin' if user['is_admin'] else '/dashboard'

                conn = get_db()
                conn.execute("UPDATE users SET last_login=? WHERE id=?", (datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S"), user['id']))
                conn.commit()
                conn.close()
                
                if request.is_json:
                    return jsonify({
                        'success': True,
                        'username': user['username'],
                        'redirect': redirect_url
                    })
                return redirect(redirect_url)

        else:
            if request.is_json:
                return jsonify({'success': False, 'error': 'Invalid password'})
            flash('Invalid credentials', 'danger')
        
    return render_template('login.html')


#----------------------------------------------------------------------------------------------------------------------------------

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        start = datetime.now(IST)
        if request.is_json:
            data = request.get_json()
            username = data.get('username', '').strip()
            email = data.get('email', '').strip()
            password = data.get('password', '')
        else:
            username = request.form['username']
            email = request.form['email']
            password = request.form['password']

        try:
            conn = get_db()
            conn.execute(
                "INSERT INTO users (username, email, password_hash, created_at) VALUES (?,?,?,?)",
                (username, email, generate_password_hash(password), start.strftime("%Y-%m-%d %H:%M:%S" )))
            conn.commit()
            conn.close()
            if request.is_json:
                return jsonify({'success': True})
            flash('Account created!', 'success')
            return redirect(url_for('login'))

        except sqlite3.IntegrityError:
            if request.is_json:
                return jsonify({'success': False, 'error': 'Email or username already exists'})
            flash('Email or username already exists.', 'danger')

    return render_template('register.html')


@app.route('/dashboard')
def dashboard():
    
    if session.get('is_admin'):
        return redirect(url_for('admin'))
    
    if 'user_id' not in session:
            return redirect(url_for('login'))

    conn = get_db()

    scans = conn.execute("SELECT * FROM scan_history WHERE user_id=? ORDER BY scan_date DESC LIMIT 10 ",
                         (session['user_id'],)).fetchall()

    total_scans = conn.execute("SELECT COUNT(*) FROM scan_history WHERE user_id=?",
                        (session['user_id'],)).fetchone()[0]

    breaches_found = conn.execute("SELECT SUM(breach_count) FROM scan_history WHERE user_id=?",
                        (session['user_id'],)).fetchone()[0] 

    safe_accounts = conn.execute("SELECT COUNT(*) FROM scan_history WHERE user_id=? AND breach_count=0 ",
                                 (session['user_id'],)).fetchone()[0]

    active_alerts = conn.execute("SELECT COUNT(*) FROM scan_history WHERE user_id=? AND UPPER (risk_level) IN ('HIGH','CRITICAL')",
                                 (session['user_id'],)).fetchone()[0]

    conn.close()

    return render_template('dashboard.html',
        username=session['username'],
        total_scans=total_scans,
        breaches_found=breaches_found,
        safe_accounts=safe_accounts,
        active_alerts=active_alerts)

#----------------------------------------------------------------------------------------------------------------------------------

@app.route('/api/scan-history')
def scan_history():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    scans = conn.execute("SELECT * FROM scan_history WHERE user_id=? ORDER BY scan_date DESC LIMIT 10",
                (session['user_id'],)).fetchall()
    
    conn.close()
    return jsonify({'scans': [dict(s) for s in scans]})


#--------------------------------------------------------------------------------------------------------------------------------

@app.route('/scanner')
def scanner():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('scanner.html')


#---------------------------------------------------------------------------------------------------------------------------------

@app.route('/api/scan', methods=['POST'])
def api_scan():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    email = request.get_json().get('email', '').strip()
    platform = request.get_json().get('platform', '').strip()
    
    if not email:
        return jsonify({'error': 'Email required'}), 400
    
    try:
        start = datetime.now(IST)
        resp = requests.get(f"{app.config['XPOSEDORNOT_API']}/breach-analytics?email={email}", timeout=10)
        response_time = (datetime.now(IST) - start).total_seconds()
        conn = get_db()
        conn.execute("INSERT INTO api_logs (endpoint, status_code, response_time) VALUES (?,?,?)",
            ('/breach-analytics', resp.status_code, response_time))
        
        conn.commit()

        if resp.status_code != 200:
            return jsonify({'error' : 'External API error'}), 500
        
       
        data = resp.json()
        exposed = data.get('ExposedBreaches')

        if not exposed:
            clean_sites = json.dumps([platform]) if platform else json.dumps(['All'])
             
            conn.execute("INSERT INTO scan_history (user_id,scanned_email,risk_level,risk_score,breach_count, breached_sites, scan_date) VALUES (?,?,?,?,?,?,?)",
               (session['user_id'], email, 'None', 0, 0, clean_sites, start.strftime("%Y-%m-%d %H:%M:%S")))
        

            conn.commit()
            return jsonify ({'success': True, 'email': email, 'platform': platform or 'All', 'breach_count': 0, 'risk_level': 'None', 'risk_score': 0, 'breaches': [] })           
        

        breaches_raw = exposed.get('breaches_details', [])

        if platform:
            breaches_raw = [b for b in breaches_raw
                            if platform in b.get('breach',).lower()
                            or platform in b.get('domain', '').lower()]
            sites = json.dumps([platform])

        else:
            
            sites = json.dumps([b.get('breach', '') for b in breaches_raw])
            
        breach_count = len(breaches_raw)

        breach_names = [{"name" : b.get("breach") } for b in breaches_raw]
        Breach_details = [{"Name" : b.get("breach"),
                        "Description": b.get("details"),
                        "breach_date": b.get("xposed_date"),
                        "exposed_data": b.get("xposed_data")}
                        for b in breaches_raw]

        #Risk Calculation
        if not platform:
            risk_raw = data.get('BreachMetrics', {}).get('risk',[{}])
            risk_level = risk_raw[0].get('risk_label') if risk_raw else 'None'
            risk_score = risk_raw[0].get('risk_score') if risk_raw else 0

        else:                  
            if breach_count == 0:
                risk_level, risk_score = 'SECURE', 0
            elif breach_count <=2:
                risk_level, risk_score = 'LOW', 10
            elif breach_count <= 5:
                risk_level, risk_score = 'MEDIUM', 40
            elif breach_count <= 8:
                risk_level, risk_score = 'HIGH', 70
            else:
                risk_level, risk_score = 'CRITICAL', 95
                
                                            
        scan_id = conn.execute("INSERT INTO scan_history (user_id,scanned_email,risk_level,risk_score,breach_count,breached_sites, scan_date) VALUES (?,?,?,?,?,?,?)",
            (session['user_id'], email, risk_level, risk_score, breach_count, sites, start.strftime("%Y-%m-%d %H:%M:%S"))).lastrowid
        
        for breach in Breach_details:   
            conn.execute("INSERT INTO breach_reports (scan_id, email, breach_name, breach_date, breach_desc, data_exposed) VALUES (?,?,?,?,?,?)", (scan_id, email, breach['Name'], breach['breach_date'], breach['Description'], breach['exposed_data']))
        conn.commit()
            
        return jsonify({'success':True, 'email':email, 'platform': platform or 'All', 'breach_count':breach_count,'risk_level':risk_level,'risk_score':risk_score, 'breaches' : breach_names})
    
    except requests.Timeout:
        return jsonify({'error': "Scan timed out. Please try again."}), 504

    except Exception as e:
      return jsonify({'error' : 'Internal server error'}), 500
   
        
    finally:
        if 'conn' in locals():
            conn.close()


#-------------------------------------------------------------------------------------------------------------------------------

@app.route('/admin')
def admin():
    if not session.get('is_admin'): return redirect(url_for('login'))
    conn = get_db()

    # Users with scan count and highest risk
    users = conn.execute("""
        SELECT u.*,
               COUNT(s.id) as scan_count,
               (SELECT risk_level FROM scan_history
                WHERE user_id = u.id
                ORDER BY risk_score DESC LIMIT 1) as max_risk
        FROM users u
        LEFT JOIN scan_history s ON s.user_id = u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    """).fetchall()

    # Recent 50 scans
    scans = conn.execute(
        "SELECT s.*, u.username FROM scan_history s JOIN users u ON s.user_id=u.id ORDER BY s.scan_date DESC LIMIT 50"
    ).fetchall()

    # Breach reports grouped by platform
    breach_reports_agg = conn.execute("""
        SELECT breach_name,
               COUNT(*) as affected_count,
               MAX(breach_date) as latest_date
        FROM breach_reports
        GROUP BY breach_name
        ORDER BY affected_count DESC
        LIMIT 20
    """).fetchall()

    # Contact messages
    try:
        messages = conn.execute(
            "SELECT * FROM contact_queries ORDER BY sent_at DESC LIMIT 50"
        ).fetchall()
        unread_count = conn.execute(
            "SELECT COUNT(*) FROM contact_queries WHERE status='unread'"
        ).fetchone()[0]
    except Exception:
        messages = []
        unread_count = 0

    # Support tickets
    try:
        support_tickets_all = conn.execute("""
            SELECT t.*, u.username, u.email as user_email
            FROM support_tickets t JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC LIMIT 50
        """).fetchall()
        open_tickets = conn.execute(
            "SELECT COUNT(*) FROM support_tickets WHERE status='OPEN'"
        ).fetchone()[0]
    except Exception:
        support_tickets_all = []
        open_tickets = 0

    # Top platforms from breached_sites
    platform_rows = conn.execute(
        "SELECT breached_sites FROM scan_history WHERE breach_count > 0"
    ).fetchall()
    platform_counts = {}
    for row in platform_rows:
        try:
            sites = json.loads(row['breached_sites'] or '[]')
            for site in sites:
                if site and site not in ('None', 'All'):
                    platform_counts[site] = platform_counts.get(site, 0) + 1
        except Exception:
            pass
    top_platforms = sorted(platform_counts.items(), key=lambda x: x[1], reverse=True)[:6]

    # Monthly new users (last 6 months)
    monthly_rows = conn.execute("""
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
        FROM users GROUP BY month ORDER BY month DESC LIMIT 6
    """).fetchall()
    monthly_users = [[r['month'], r['count']] for r in reversed(monthly_rows)]

    stats = {
        'total_users':  conn.execute("SELECT COUNT(*) FROM users").fetchone()[0],
        'total_scans':  conn.execute("SELECT COUNT(*) FROM scan_history").fetchone()[0],
        'high_risk':    conn.execute("SELECT COUNT(*) FROM scan_history WHERE UPPER (risk_level) IN ('HIGH','CRITICAL')").fetchone()[0],
        'api_calls':    conn.execute("SELECT COUNT(*) FROM api_logs").fetchone()[0],
        'unread_msgs':  unread_count,
        'open_tickets': open_tickets,
    }
    conn.close()

    return render_template('admin.html',
        users=users,
        scans=scans,
        stats=stats,
        breach_reports_agg=breach_reports_agg,
        messages=messages,
        support_tickets=support_tickets_all,
        top_platforms=top_platforms,
        monthly_users=monthly_users
    )


#-------------------------------------------------------------------------------------------------------------------------------

@app.route('/admin/delete_user/<int:uid>', methods=['POST'])
def delete_user(uid):
    if not session.get('is_admin'): return redirect(url_for('login'))
    conn = get_db()
    conn.execute("DELETE FROM users WHERE id=?", (uid,))
    conn.commit(); conn.close()
    return redirect(url_for('admin'))


#-----------------------------------------------------------------------------------------------------------------------------------

@app.route('/api/chart-data')
def chart_data():
    if not session.get('is_admin'):
        return jsonify({}), 401
    
    conn = get_db()
    
    # get last 7 days as a list
    today = datetime.now(IST).date()
    last_7_days = [(today - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(6, -1, -1)]
    
    # get actual scan counts
    rows = conn.execute("""
        SELECT SUBSTR(scan_date, 1, 10) as day, COUNT(*) as count 
        FROM scan_history 
        GROUP BY SUBSTR(scan_date, 1, 10)
        ORDER BY day DESC 
        LIMIT 7
    """).fetchall()
    
    # map to dict
    scan_map = {r['day']: r['count'] for r in rows}
    
    # fill missing days with 0
    scans_by_day = [{'day': day, 'count': scan_map.get(day, 0)} for day in last_7_days]
    
    risk_dist = conn.execute(
        "SELECT risk_level, COUNT(*) as count FROM scan_history GROUP BY risk_level"
    ).fetchall()
    conn.close()
    
    return jsonify({
        'scans_by_day': scans_by_day,
        'risk_dist': [{'level': r['risk_level'].upper() if r['risk_level'] else 'NONE', 'count': r['count']} for r in risk_dist]
    })

#---------------------------------------------------------------------------------------------------------------------------------------------

@app.route('/contact', methods=['GET','POST'])
def contact():
    if request.method == 'POST' :
        if request.is_json:
            data = request.get_json()
            name = data.get('name', '').strip()
            email = data.get('email', '').strip()
            subject = data.get('subject', '').strip()
            message = data.get('message', '')
        else :
            name = request.form['name']
            email = request.form['email']
            subject = request.form['subject']
            message = request.form['message']

        try :
            date = datetime.now(IST)
            conn = get_db()
            
            userid = session.get('user_id')
            
            conn.execute("INSERT INTO contact_queries (user_id, full_name, email, subject, message, sent_at) VALUES (?,?,?,?,?,?)",
                         (userid, name, email, subject, message, date.strftime("%Y-%m-%d %H:%M:%S")))
            conn.commit()
            conn.close()
            
            return jsonify({
                    "success": True,
                    "message": "Message sent successfully."
                    })
            
        except Exception as e:
            import traceback
            traceback.print_exc()

            return jsonify({
                "success": False,
                "error": str(e)
                }),500
    
    return render_template('contact.html')


#----------------------------------------------------------------------------------------------------------------------------

@app.route('/awareness')
def awareness():
    return render_template('awareness.html')


#-----------------------------------------------------------------------------------------------------------------------------

@app.route('/api/news')
def get_news():
    
    try:
        url = "https://newsapi.org/v2/everything"
        params = {
           "qInTitle": (
            '"data breach" OR '
            '"cyberattack" OR '
            '"malware" OR '
            '"ransomware" OR '
            '"phishing" OR '
            '"security breach" OR '
            '"DDOS attack" OR '
            '"cryptojacking attack"'
        ),
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 12,
        "apiKey": app.config["NEWS_API_KEY"]
        }
 
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
 
        if response.status_code == 200 and data.get('status') == 'ok':
            
            articles = [
                article for article in data.get('articles', [])
                if article.get('title') and 
                   article.get('description') and 
                   article.get('url') and
                   article.get('title') != '[Removed]'
            ]
 
         
            if not articles:
                return jsonify({ 'success': False, 'error': 'No articles available at this time' }), 500
 
            return jsonify({ 'success': True, 'articles': articles })
        
        else:
            error_msg = data.get('message', 'Unknown API error')
            return jsonify({ 'success': False, 'error': error_msg }), 500
 
    except requests.Timeout:
        return jsonify({'success': False, 'error': 'API request timed out. Please try again.' }), 504
 
    except Exception as e:
        return jsonify({ 'success': False, 'error': 'Failed to fetch news. Please try again later.' }), 500

    
#------------------------------------------------------------------------------------------------------------------------------
    
# reads from YOUR database
    # returns real username, email, join date, total scans
@app.route('/api/user-profile')
def user_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    user = conn.execute("SELECT id, username, email, created_at FROM users WHERE id=?",
                        (session['user_id'],)).fetchone()
    total_scans = conn.execute("SELECT COUNT(*) FROM scan_history WHERE user_id=?",
                               (session['user_id'],)).fetchone()[0]
    conn.close()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'username':    user['username'],
        'email':       user['email'],
        'created_at':  user['created_at'],
        'total_scans': total_scans
    })


#------------------------------------------------------------------------------------------------------------------------------

# takes new username
    # validates it (not empty, at least 3 chars)
    # saves to database
    # updates your session too
@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    new_username = data.get('username', '').strip()
    if not new_username:
        return jsonify({'success': False, 'error': 'Username cannot be empty'}), 400
    if len(new_username) < 3:
        return jsonify({'success': False, 'error': 'Username must be at least 3 characters'}), 400
    try:
        conn = get_db()
        conn.execute("UPDATE users SET username=? WHERE id=?",
                     (new_username, session['user_id']))
        conn.commit()
        conn.close()
        session['username'] = new_username   # keep session in sync
        return jsonify({'success': True, 'username': new_username})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'error': 'Username already taken'}), 409
    
#-----------------------------------------------------------------------------------------------------------------------------

@app.route('/api/breach-details/<int:scan_id>')
def breach_details(scan_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    conn = get_db()

    # Make sure this scan belongs to the logged-in user (security check)
    scan = conn.execute(
        "SELECT * FROM scan_history WHERE id=? AND user_id=?",
        (scan_id, session['user_id'])
    ).fetchone()

    if not scan:
        conn.close()
        return jsonify({'error': 'Scan not found'}), 404

    # Get the real breach details linked to this scan
    reports = conn.execute(
        "SELECT breach_name, breach_date, breach_desc, data_exposed FROM breach_reports WHERE scan_id=?",
        (scan_id,)
    ).fetchall()

    conn.close()

    return jsonify({
        'scan_id':       scan_id,
        'scan_date':     scan['scan_date'],
        'scanned_email': scan['scanned_email'],
        'risk_level':    scan['risk_level'],
        'risk_score':    scan['risk_score'],
        'breach_count':  scan['breach_count'],
        'reports': [
            {
                'breach_name':  r['breach_name'],
                'breach_date':  r['breach_date'],
                'breach_desc':  r['breach_desc'],
                'data_exposed': r['data_exposed']
            }
            for r in reports
        ]
    })

#---------------------------------------------------------------------------------------------------------------------------

@app.route('/api/download-report')
def download_report():
    # Backward compatibility — redirects to full report
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('download_scan_report', scan_id='all'))


@app.route('/api/download-report/<scan_id>')
def download_scan_report(scan_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))

    conn = get_db()
    user = conn.execute("SELECT username, email, created_at FROM users WHERE id=?",
                        (session['user_id'],)).fetchone()

    # Determine which scans to include
    if scan_id == 'all':
        scans = conn.execute(
            "SELECT * FROM scan_history WHERE user_id=? ORDER BY scan_date DESC",
            (session['user_id'],)
        ).fetchall()
    else:
        try:
            sid = int(scan_id)
        except ValueError:
            conn.close()
            return "Invalid scan ID", 400
        scans = conn.execute(
            "SELECT * FROM scan_history WHERE id=? AND user_id=?",
            (sid, session['user_id'])
        ).fetchall()
        if not scans:
            conn.close()
            return "Scan not found or access denied", 404

    # Pull breach reports for these scans
    scan_ids = [s['id'] for s in scans]
    breach_map = {}
    if scan_ids:
        placeholders = ','.join('?' * len(scan_ids))
        reports = conn.execute(
            f"SELECT * FROM breach_reports WHERE scan_id IN ({placeholders})",
            scan_ids
        ).fetchall()
        for r in reports:
            breach_map.setdefault(r['scan_id'], []).append(r)

    conn.close()

    is_single = (scan_id != 'all')
    scan_obj  = scans[0] if scans else None

    # ── Build PDF ──
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                             topMargin=0.6*inch, bottomMargin=0.6*inch,
                             leftMargin=0.6*inch, rightMargin=0.6*inch)
    styles = getSampleStyleSheet()

    title_style   = ParagraphStyle('TitleGreen', parent=styles['Title'],
                                    textColor=colors.HexColor('#0a5c3a'), fontSize=22)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'],
                                    textColor=colors.HexColor('#0a5c3a'), spaceAfter=8, spaceBefore=16)
    normal = styles['Normal']
    muted  = ParagraphStyle('Muted', parent=styles['Normal'], textColor=colors.grey, fontSize=9)

    story = []

    # ── Title block ──
    title_text = "IdentityShield Scan Report" if is_single else "IdentityShield Security Report"
    story.append(Paragraph(title_text, title_style))
    story.append(Paragraph(f"Generated for: {user['username']} ({user['email']})", normal))
    story.append(Paragraph(f"Report date: {datetime.now(IST).strftime('%d %b %Y, %I:%M %p IST')}", muted))
    story.append(Spacer(1, 16))

    if is_single and scan_obj:
        # ════ SINGLE SCAN REPORT ════
        result_text = 'BREACHED' if scan_obj['breach_count'] > 0 else 'SAFE'

        story.append(Paragraph("Scan Details", heading_style))
        scan_data = [
            ['Email Scanned',  scan_obj['scanned_email']],
            ['Scan Date',      scan_obj['scan_date'][:16] if scan_obj['scan_date'] else 'Unknown'],
            ['Result',         result_text],
            ['Risk Level',     scan_obj['risk_level'] or 'N/A'],
            ['Risk Score',     f"{scan_obj['risk_score']}/100"],
            ['Breaches Found', str(scan_obj['breach_count'])],
        ]
        scan_table = Table(scan_data, colWidths=[2.5*inch, 4*inch])
        scan_table.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (0,-1), colors.HexColor('#eafaf1')),
            ('TEXTCOLOR',     (0,0), (-1,-1), colors.HexColor('#1a1a2e')),
            ('FONTSIZE',      (0,0), (-1,-1), 10),
            ('GRID',          (0,0), (-1,-1), 0.5, colors.HexColor('#cccccc')),
            ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING',    (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(scan_table)
        story.append(Spacer(1, 16))

        # Breach details for this scan
        rpts = breach_map.get(scan_obj['id'], [])
        if rpts:
            story.append(Paragraph("Breach Details", heading_style))
            for r in rpts:
                story.append(Paragraph(
                    f"<b>{r['breach_name']}</b> — Breach date: {r['breach_date'] or 'Unknown'}", normal
                ))
                if r['data_exposed']:
                    story.append(Paragraph(f"Data exposed: {r['data_exposed']}", muted))
                if r['breach_desc']:
                    desc = r['breach_desc'][:300] + ('...' if len(r['breach_desc']) > 300 else '')
                    story.append(Paragraph(desc, muted))
                story.append(Spacer(1, 6))
        else:
            story.append(Paragraph("No breach details recorded for this scan.", muted))

    else:
        # ════ FULL REPORT (all scans) ════
        total_scans    = len(scans)
        total_breaches = sum(s['breach_count'] for s in scans)
        high_risk      = sum(1 for s in scans if s['risk_level'] in ('HIGH', 'CRITICAL'))
        latest_score   = scans[0]['risk_score'] if scans else 0
        latest_level   = scans[0]['risk_level'] if scans else 'N/A'

        story.append(Paragraph("Risk Summary", heading_style))
        summary_data = [
            ['Total Scans Performed',   str(total_scans)],
            ['Total Breaches Found',    str(total_breaches)],
            ['High / Critical Scans',   str(high_risk)],
            ['Latest Risk Score',       f"{latest_score}/100"],
            ['Latest Risk Level',       latest_level],
        ]
        summary_table = Table(summary_data, colWidths=[3*inch, 3*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (0,-1), colors.HexColor('#eafaf1')),
            ('TEXTCOLOR',     (0,0), (-1,-1), colors.HexColor('#1a1a2e')),
            ('FONTSIZE',      (0,0), (-1,-1), 10),
            ('GRID',          (0,0), (-1,-1), 0.5, colors.HexColor('#cccccc')),
            ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING',    (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 16))

        story.append(Paragraph("Scan History", heading_style))
        if not scans:
            story.append(Paragraph("No scans performed yet.", normal))
        else:
            history_data = [['Date', 'Email Scanned', 'Breaches', 'Risk Score', 'Result']]
            for s in scans:
                history_data.append([
                    s['scan_date'][:16] if s['scan_date'] else '',
                    s['scanned_email'],
                    str(s['breach_count']),
                    f"{s['risk_score']}/100",
                    'BREACHED' if s['breach_count'] > 0 else 'SAFE'
                ])
            history_table = Table(history_data, colWidths=[1.3*inch, 2*inch, 0.8*inch, 0.9*inch, 1*inch])
            history_table.setStyle(TableStyle([
                ('BACKGROUND',    (0,0), (-1,0), colors.HexColor('#0a5c3a')),
                ('TEXTCOLOR',     (0,0), (-1,0), colors.white),
                ('FONTSIZE',      (0,0), (-1,-1), 8.5),
                ('GRID',          (0,0), (-1,-1), 0.5, colors.HexColor('#cccccc')),
                ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING',    (0,0), (-1,-1), 5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                ('ROWBACKGROUNDS',(0,1), (-1,-1), [colors.white, colors.HexColor('#f5f5f5')]),
            ]))
            story.append(history_table)

        # Exposure details section
        breached_scans = [s for s in scans if s['breach_count'] > 0]
        if breached_scans:
            story.append(PageBreak())
            story.append(Paragraph("Exposure Details", heading_style))
            for s in breached_scans:
                story.append(Paragraph(
                    f"<b>{s['scanned_email']}</b> &nbsp;—&nbsp; Scanned on {s['scan_date'][:16] if s['scan_date'] else ''} "
                    f"&nbsp;—&nbsp; Risk: {s['risk_level']} ({s['risk_score']}/100)",
                    ParagraphStyle('ScanHead', parent=normal, fontSize=11,
                                   textColor=colors.HexColor('#1a1a2e'), spaceBefore=10, spaceAfter=4)
                ))
                rpts = breach_map.get(s['id'], [])
                if not rpts:
                    story.append(Paragraph("No detailed breach records available for this scan.", muted))
                    continue
                for r in rpts:
                    story.append(Paragraph(f"&bull; <b>{r['breach_name']}</b> ({r['breach_date'] or 'date unknown'})", normal))
                    if r['data_exposed']:
                        story.append(Paragraph(f"&nbsp;&nbsp;Data exposed: {r['data_exposed']}", muted))
                    if r['breach_desc']:
                        desc = r['breach_desc'][:300] + ('...' if len(r['breach_desc']) > 300 else '')
                        story.append(Paragraph(f"&nbsp;&nbsp;{desc}", muted))
                    story.append(Spacer(1, 4))

    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "This report was generated by IdentityShield based on real-time breach intelligence. "
        "Always change passwords for breached accounts and enable multi-factor authentication.",
        muted
    ))

    doc.build(story)
    buf.seek(0)

    if is_single and scan_obj:
        filename = f"IdentityShield_Scan_{scan_obj['id']}_{user['username']}_{datetime.now(IST).strftime('%Y%m%d')}.pdf"
    else:
        filename = f"IdentityShield_Report_{user['username']}_{datetime.now(IST).strftime('%Y%m%d')}.pdf"

    return send_file(buf, mimetype='application/pdf', as_attachment=True, download_name=filename)


#---------------------------------------------------------------------------------------------------------------------------------

@app.route('/api/support-tickets', methods=['GET', 'POST'])
def support_tickets():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    conn = get_db()
    date = datetime.now(IST)

    if request.method == 'POST':
        data = request.get_json()
        subject = data.get('subject', '').strip()
        message = data.get('message', '').strip()

        if not subject or not message:
            conn.close()
            return jsonify({'success': False, 'error': 'Subject and message are required'}), 400

        conn.execute(
            "INSERT INTO support_tickets (user_id, subject, message, created_at) VALUES (?,?,?,?)",
            (session['user_id'], subject, message, date.strftime("%Y-%m-%d %H:%M:%S"))
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True})

    # GET — return this user's tickets, newest first
    tickets = conn.execute(
        "SELECT * FROM support_tickets WHERE user_id=? ORDER BY created_at DESC",
        (session['user_id'],)
    ).fetchall()
    conn.close()
    return jsonify({'tickets': [dict(t) for t in tickets]})

#---------------------------------------------------------------------------------------------------------------------------

@app.route('/admin/support-tickets')
def admin_support_tickets():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    tickets = conn.execute("""
        SELECT t.*, u.username, u.email
        FROM support_tickets t JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
    """).fetchall()
    conn.close()
    return jsonify({'tickets': [dict(t) for t in tickets]})

#-----------------------------------------------------------------------------------------------------------------------------

@app.route('/admin/reply-ticket/<int:ticket_id>', methods=['POST'])
def reply_ticket(ticket_id):
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    reply = data.get('reply', '').strip()
    if not reply:
        return jsonify({'success': False, 'error': 'Reply cannot be empty'}), 400

    conn = get_db()
    conn.execute(
        "UPDATE support_tickets SET admin_reply=?, status='ANSWERED', replied_at=CURRENT_TIMESTAMP WHERE id=?",
        (reply, ticket_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True})

#--------------------------------------------------------------------------------------------------------------------------------

@app.route('/admin/message/read/<int:msg_id>', methods=['POST'])
def mark_message_read(msg_id):
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    conn.execute("UPDATE contact_queries SET status='read' WHERE id=?", (msg_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

#---------------------------------------------------------------------------------------------------------------------------------

@app.route('/admin/message/reply/<int:msg_id>', methods=['POST'])
def reply_message(msg_id):
    
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    reply = request.get_json().get('reply', '').strip()
    if not reply:
        return jsonify({'error': 'Reply cannot be empty'}), 400
    
    conn = get_db()
    
    # get the original message details
    query = conn.execute(
        "SELECT * FROM contact_queries WHERE id=?", (msg_id,)
    ).fetchone()
    
    if not query:
        conn.close()
        return jsonify({'error': 'Message not found'}), 404
    
    # save reply to DB
    conn.execute(
        "UPDATE contact_queries SET status='replied', admin_reply=?, replied_at=? WHERE id=?",
        (reply, datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S"), msg_id))
    conn.commit()

    
    # send email to user
    try:
        msg = Message(
            subject=f"{query['subject']} — IdentityShield Support",
            sender=app.config['MAIL_USERNAME'],
            recipients=[query['email']]
        )
        msg.body = f"""
        Hi {query['full_name']},

        Thank you for contacting IdentityShield Support.

        Your Query:
        {query['message']}

        Our Reply:
        {reply}

        ---
        Team IdentityShield
        """
        msg.html = render_template(
        'email-reply.html',
        name=query['full_name'],
        query_message=query['message'],
        reply=reply
        )
        
        mail.send(msg)
        email_sent = True

    except Exception as e:
        email_sent = False

    # update delivery status — conn still open
    delivery_status = 'delivered' if email_sent else 'failed'
    conn.execute(
        "UPDATE contact_queries SET delivery_status=? WHERE id=?",
        (delivery_status, msg_id)
    )
    conn.commit()
    conn.close()  

    if email_sent:
        return jsonify({'success': True, 'message': 'Reply sent successfully'})
    else:
        return jsonify({
            'success': True,
            'warning': 'Reply saved but email could not be delivered.'
        })
#---------------------------------------------------------------------------------------------------------------------------------

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

#---------------------------------------------------------------------------------------------------------------------------------

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
