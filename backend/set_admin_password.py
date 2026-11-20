"""Set (or change) the admin password. Stores only a bcrypt hash in backend/.env.

    python -m backend.set_admin_password
"""
import getpass
import re

import bcrypt

from backend.app.config import BACKEND_DIR

if __name__ == "__main__":
    pw = getpass.getpass("New admin password (min 10 characters): ")
    if len(pw) < 10 or pw != getpass.getpass("Repeat password: "):
        raise SystemExit("Passwords didn't match or were shorter than 10 characters. Nothing changed.")
    hashed = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
    env = BACKEND_DIR / ".env"
    text = env.read_text() if env.exists() else ""
    line = f"ADMIN_PASSWORD_HASH='{hashed}'"
    text = re.sub(r"^ADMIN_PASSWORD_HASH=.*$", line, text, flags=re.M) if "ADMIN_PASSWORD_HASH=" in text else text + line + "\n"
    text = re.sub(r"^# Local demo admin password:.*\n", "", text, flags=re.M)
    env.write_text(text)
    print("Admin password updated. Restart the backend.")
