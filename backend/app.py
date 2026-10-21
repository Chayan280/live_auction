import os
import re
import io
import sqlite3
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import pandas as pd
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

DB_NAME = "database.db"
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def transform_drive_url(url):
    """Google Drive view link ko direct image render link me convert karta hai"""
    if not isinstance(url, str) or not url.strip():
        return ""
    match = re.search(r'(?:id=|\/d\/)([a-zA-Z0-9_-]+)', url)
    if match:
        return f"https://lh3.googleusercontent.com/d/{match.group(1)}"
    return url.strip()

def get_col_val(row, possible_names, default="--"):
    """Excel headers me case-insensitive matching karta hai"""
    def normalize_header(value):
        return re.sub(r'[^a-z0-9]', '', str(value).strip().lower())

    for col in row.index:
        clean_col = normalize_header(col)
        for name in possible_names:
            if clean_col == normalize_header(name):
                val = row[col]
                if pd.notna(val) and str(val).strip() != "":
                    return str(val).strip()
    return default

def format_reg_no(value):
    """Format numeric registration numbers as three digits."""
    value = str(value).strip()
    if re.fullmatch(r'\d+(?:\.0+)?', value):
        return str(int(float(value))).zfill(3)
    return value

def migrate_registration_numbers():
    conn = sqlite3.connect(DB_NAME)
    rows = conn.execute("SELECT id, reg_no FROM players ORDER BY id").fetchall()
    for player_id, reg_no in rows:
        formatted = format_reg_no(reg_no)
        if formatted != reg_no:
            conn.execute("UPDATE players SET reg_no=? WHERE id=?", (formatted, player_id))
    conn.commit()
    conn.close()

def next_registration_number(used_numbers):
    number = 1
    while format_reg_no(number) in used_numbers:
        number += 1
    registration_number = format_reg_no(number)
    used_numbers.add(registration_number)
    return registration_number

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # Players Table (added block column)
    c.execute('''CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reg_no TEXT UNIQUE,
        name TEXT,
        category TEXT,
        batting_style TEXT,
        bowling_style TEXT,
        district TEXT,
        block TEXT,
        photo_url TEXT,
        base_price REAL DEFAULT 400,
        status TEXT DEFAULT 'UNSOLD',
        sold_to TEXT DEFAULT NULL,
        sold_price REAL DEFAULT 0,
        round_no INTEGER DEFAULT 1
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        budget REAL DEFAULT 50000,
        purse_left REAL DEFAULT 50000,
        squad_count INTEGER DEFAULT 0
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS auction_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        bid_step_1 REAL DEFAULT 100,
        bid_step_2 REAL DEFAULT 500,
        bid_step_3 REAL DEFAULT 1000,
        current_round INTEGER DEFAULT 1
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS bids_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER,
        team_name TEXT,
        bid_amount REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute("INSERT OR IGNORE INTO auction_settings (id, bid_step_1, bid_step_2, bid_step_3, current_round) VALUES (1, 100, 500, 1000, 1)")
    conn.commit()
    conn.close()
    migrate_registration_numbers()

init_db()

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/image-proxy')
def image_proxy():
    source_url = request.args.get('url', '').strip()
    parsed = urlparse(source_url)
    allowed_hosts = {'lh3.googleusercontent.com', 'drive.google.com', 'googleusercontent.com'}
    if parsed.scheme not in {'http', 'https'} or parsed.hostname not in allowed_hosts:
        return jsonify({'error': 'Unsupported image host'}), 400

    try:
        upstream_request = Request(source_url, headers={'User-Agent': 'LiveAuctions/1.0'})
        with urlopen(upstream_request, timeout=10) as upstream:
            image_data = upstream.read()
            content_type = upstream.headers.get_content_type()
        return send_file(io.BytesIO(image_data), mimetype=content_type, max_age=3600)
    except Exception as error:
        return jsonify({'error': f'Unable to load image: {error}'}), 502

@app.route('/api/upload-photo', methods=['POST'])
def upload_photo():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        return jsonify({'photo_url': f"http://localhost:5000/uploads/{filename}"})

# --- BID HISTORY APIS ---
@app.route('/api/bids/add', methods=['POST'])
def add_bid_log():
    data = request.json
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''INSERT INTO bids_history (player_id, team_name, bid_amount) VALUES (?, ?, ?)''',
              (data['player_id'], data['team_name'], data['bid_amount']))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Bid logged successfully'})

@app.route('/api/bids/player/<int:player_id>', methods=['GET'])
def get_player_bids(player_id):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM bids_history WHERE player_id=? ORDER BY id DESC", (player_id,))
    logs = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(logs)

# --- PLAYERS APIS ---
@app.route('/api/players', methods=['GET'])
def get_players():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM players ORDER BY id ASC")
    players = [dict(row) for row in c.fetchall()]
    for player in players:
        player['reg_no'] = format_reg_no(player['reg_no'])
    conn.close()
    return jsonify(players)

@app.route('/api/players/add', methods=['POST'])
def add_player():
    data = request.json
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        photo = transform_drive_url(data.get('photo_url', ''))
        reg_no = format_reg_no(data['reg_no'])
        c.execute('''INSERT INTO players (reg_no, name, category, batting_style, bowling_style, district, block, photo_url, base_price)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
              (reg_no, data['name'], data['category'], data['batting_style'], 
                   data['bowling_style'], data['district'], data.get('block', '--'), photo, data.get('base_price', 400)))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Player added successfully!'})
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 400

@app.route('/api/players/update', methods=['POST'])
def update_player():
    data = request.json
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    photo = transform_drive_url(data.get('photo_url', ''))
    reg_no = format_reg_no(data['reg_no'])
    c.execute('''UPDATE players SET reg_no=?, name=?, category=?, batting_style=?, bowling_style=?, district=?, block=?, base_price=?, photo_url=? WHERE id=?''',
              (reg_no, data['name'], data['category'], data['batting_style'], data['bowling_style'], data['district'], data.get('block', '--'), data['base_price'], photo, data['id']))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Player updated successfully!'})

@app.route('/api/players/delete/<int:player_id>', methods=['DELETE'])
def delete_player(player_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM players WHERE id=?", (player_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Player deleted!'})

@app.route('/api/players/sell', methods=['POST'])
def sell_player():
    data = request.json
    player_id = data.get('player_id')
    sold_to = data.get('sold_to')
    sold_price = data.get('sold_price')
    status = data.get('status', 'SOLD')

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    if status == 'SOLD':
        c.execute('''UPDATE players SET status='SOLD', sold_to=?, sold_price=? WHERE id=?''', (sold_to, sold_price, player_id))
        c.execute('''UPDATE teams SET purse_left = purse_left - ?, squad_count = squad_count + 1 WHERE name=?''', (sold_price, sold_to))
    else:
        c.execute('''UPDATE players SET status='UNSOLD' WHERE id=?''', (player_id,))
        
    conn.commit()
    conn.close()
    return jsonify({'message': f'Player status updated to {status} successfully!'})

# --- TEAMS APIS ---
@app.route('/api/teams', methods=['GET'])
def get_teams():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM teams")
    teams = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(teams)

@app.route('/api/teams/add', methods=['POST'])
def add_team():
    data = request.json
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        budget = float(data.get('budget', 50000))
        c.execute('''INSERT INTO teams (name, budget, purse_left) VALUES (?, ?, ?)''', (data['name'], budget, budget))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Team added successfully!'})
    except Exception as e:
        conn.close()
        return jsonify({'error': 'Team name already exists'}), 400

@app.route('/api/teams/edit', methods=['POST'])
def edit_team():
    data = request.json
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''UPDATE teams SET name=?, budget=?, purse_left=? WHERE id=?''', 
              (data['name'], data['budget'], data['purse_left'], data['id']))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Team updated!'})

@app.route('/api/teams/delete/<int:team_id>', methods=['DELETE'])
def delete_team(team_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM teams WHERE id=?", (team_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Team deleted successfully!'})

# --- SETTINGS APIS ---
@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    if request.method == 'POST':
        data = request.json
        c.execute('''UPDATE auction_settings SET bid_step_1=?, bid_step_2=?, bid_step_3=? WHERE id=1''',
                  (data['step1'], data['step2'], data['step3']))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Bid increments updated successfully!'})
    
    c.execute("SELECT * FROM auction_settings WHERE id=1")
    settings = dict(c.fetchone())
    conn.close()
    return jsonify(settings)

# --- EXCEL IMPORT (UPDATED WITH REG_NO, BLOCK, DISTRICT, BOWLING STYLE) ---
@app.route('/api/admin/import-excel', methods=['POST'])
def import_excel():
    file = request.files.get('file')
    clear_existing = request.form.get('clear_existing') == 'true'
    
    if not file:
        return jsonify({'error': 'No file uploaded'}), 400
    
    excel_file = pd.ExcelFile(file)
    df = pd.read_excel(excel_file, sheet_name=excel_file.sheet_names[0])
    
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    if clear_existing:
        c.execute("DELETE FROM players")

    imported_count = 0
    used_reg_numbers = set() if clear_existing else {
        format_reg_no(row[0]) for row in c.execute("SELECT reg_no FROM players WHERE reg_no IS NOT NULL AND TRIM(reg_no) != ''")
    }
    for idx, row in df.iterrows():
        raw_reg_no = get_col_val(row, ['reg_no', 'registration_no', 'regno', 'reg_number'], '')
        reg_no = format_reg_no(raw_reg_no) if raw_reg_no else next_registration_number(used_reg_numbers)
        used_reg_numbers.add(reg_no)
        name = get_col_val(row, ['name', 'player_name'], 'Unknown')
        category = get_col_val(row, ['category', 'player_category', 'role'], 'All Rounder')
        batting = get_col_val(row, ['batting_style', 'batting', 'batting_type'], 'N/A')
        bowling = get_col_val(row, ['bowling_style', 'bowling', 'bowling_type'], 'N/A')
        district = get_col_val(row, ['district', 'dist'], 'N/A')
        block = get_col_val(row, ['block', 'block_name', 'salboni block player'], 'N/A')
        
        photo_raw = get_col_val(row, ['photo_url', 'player_photo', 'photo', 'image'], '')
        photo = transform_drive_url(photo_raw)
        
        base_price_val = get_col_val(row, ['base_price', 'price', 'baseprice'], '400')
        try:
            base_price = float(base_price_val)
        except ValueError:
            base_price = 400.0

        c.execute('''INSERT INTO players (reg_no, name, category, batting_style, bowling_style, district, block, photo_url, base_price, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNSOLD')
                    ON CONFLICT(reg_no) DO UPDATE SET
                    name=excluded.name, category=excluded.category, batting_style=excluded.batting_style,
                    bowling_style=excluded.bowling_style, district=excluded.district, block=excluded.block,
                    photo_url=excluded.photo_url, base_price=excluded.base_price''',
                  (reg_no, name, category, batting, bowling, district, block, photo, base_price))
        imported_count += 1

    conn.commit()
    conn.close()
    return jsonify({'message': f'Successfully imported {imported_count} players!'})

# --- EXPORT COMPLETE SUMMARY & BID LOGS TO EXCEL ---
@app.route('/api/export/summary', methods=['GET'])
def export_summary():
    conn = sqlite3.connect(DB_NAME)
    
    df_players = pd.read_sql_query("SELECT * FROM players", conn)
    df_players['reg_no'] = df_players['reg_no'].map(format_reg_no)
    df_teams = pd.read_sql_query("SELECT * FROM teams", conn)
    df_bids = pd.read_sql_query("SELECT * FROM bids_history ORDER BY id DESC", conn)
    conn.close()

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_players.to_excel(writer, sheet_name='Players Summary', index=False)
        df_teams.to_excel(writer, sheet_name='Teams Summary', index=False)
        df_bids.to_excel(writer, sheet_name='Complete Bid History', index=False)

    output.seek(0)
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'Auction_Report_{datetime.now().strftime("%Y%m%d_%H%M")}.xlsx'
    )

@app.route('/api/admin/start-next-round', methods=['POST'])
def next_round():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''UPDATE auction_settings SET current_round = current_round + 1 WHERE id=1''')
    c.execute('''UPDATE players SET round_no = round_no + 1 WHERE status = 'UNSOLD' ''')
    conn.commit()
    conn.close()
    return jsonify({'message': 'Next round initialized.'})

if __name__ == '__main__':
    app.run(port=5000, debug=True)