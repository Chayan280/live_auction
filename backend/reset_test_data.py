import sqlite3
c = sqlite3.connect('database.db')
c.execute("UPDATE players SET status='PENDING', sold_to=NULL, sold_price=0, round_no=1")
c.execute("UPDATE teams SET purse_left=budget, squad_count=0")
c.execute("DELETE FROM bids_history")
c.execute("UPDATE auction_settings SET current_round=1")
c.commit()
print("Reset done")