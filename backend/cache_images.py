import re
import sqlite3
import app as A

conn = sqlite3.connect(A.DB_NAME)
players = conn.execute("SELECT name, photo_url FROM players").fetchall()
conn.close()

client = A.app.test_client()
done = failed = skipped = 0

for name, url in players:
    match = re.search(r'/d/([a-zA-Z0-9_-]+)', url or '')
    if not match:
        skipped += 1
        continue
    source = f"https://lh3.googleusercontent.com/d/{match.group(1)}=w800"
    response = client.get('/api/image-proxy', query_string={'url': source})
    if response.status_code == 200:
        done += 1
    else:
        failed += 1
        print('FAILED:', name, response.get_json())

print(f"Saved/ready: {done}, failed: {failed}, skipped (not a Drive link): {skipped}")