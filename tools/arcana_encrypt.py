"""ARCANA ACADEMY の受け取り箱に置くファイルを作る(アプリ側 src/services/inbox/crypto.ts と同じ形式)。
使い方:
  python3 arcana_encrypt.py <取り込みファイル.json> <合言葉> <受け取り箱フォルダ(inbox)> <出力名 例 20261115>
受け取り箱フォルダに <出力名>.enc.json を作り、index.json に追記する(同名があれば上書きせず終了)。
cryptography が無ければ: pip install --break-system-packages cryptography
"""
import base64, json, os, sys
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

ITER = 200_000

def seal(text: str, passphrase: str) -> dict:
    salt, iv = os.urandom(16), os.urandom(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(passphrase.encode("utf8"))
    ct = AESGCM(key).encrypt(iv, text.encode("utf8"), None)  # 末尾に16バイトのタグ(WebCryptoと同じ)
    b = lambda x: base64.b64encode(x).decode("ascii")
    return {"v": 1, "salt": b(salt), "iv": b(iv), "ct": b(ct)}

def main(src, passphrase, inbox_dir, name):
    data = json.load(open(src, encoding="utf8"))
    assert data.get("app") == "arcana-academy-experiences" and isinstance(data.get("items"), list), "取り込みファイルの形が違う"
    os.makedirs(inbox_dir, exist_ok=True)
    fname = f"{name}.enc.json"
    path = os.path.join(inbox_dir, fname)
    if os.path.exists(path):
        print("EXISTS", fname); return
    json.dump(seal(json.dumps(data, ensure_ascii=False), passphrase), open(path, "w"))
    idx_path = os.path.join(inbox_dir, "index.json")
    idx = json.load(open(idx_path)) if os.path.exists(idx_path) else {"files": []}
    idx["files"].append({"name": fname, "date": name})
    idx["files"] = idx["files"][-120:]  # 古いものは一覧から外す(アプリは読んだファイル名を覚えている)
    json.dump(idx, open(idx_path, "w"), ensure_ascii=False, indent=1)
    print("OK", fname, len(data["items"]), "items")

if __name__ == "__main__":
    main(*sys.argv[1:5])
