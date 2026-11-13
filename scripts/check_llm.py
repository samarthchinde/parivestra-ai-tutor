"""scripts/check_llm.py - Diagnostic script to probe local LLM endpoints, active processes, and environment settings."""
import os
import sys
import time
import json
import urllib.request
import urllib.error
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# Load .env
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

llm_base_url = os.getenv("LLM_BASE_URL", "http://localhost:8000/v1")
llm_model = os.getenv("LLM_MODEL", "gemma-4")
llm_provider = os.getenv("LLM_PROVIDER", "openai")

print("=" * 60)
print("1. ENVIRONMENT VARIABLES (.env)")
print("=" * 60)
print(f"LLM_BASE_URL : {llm_base_url}")
print(f"LLM_MODEL    : {llm_model}")
print(f"LLM_PROVIDER : {llm_provider}")
print()

print("=" * 60)
print("2. PROBING PORTS & HOSTS (127.0.0.1 and localhost)")
print("=" * 60)

hosts = ["127.0.0.1", "localhost"]
ports = [8000, 8888, 8080, 11434]

for port in ports:
    for host in hosts:
        if port == 11434:
            urls = [f"http://{host}:{port}/api/tags", f"http://{host}:{port}/v1/models"]
        else:
            urls = [f"http://{host}:{port}/v1/models"]
        
        for url in urls:
            t0 = time.perf_counter()
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Diagnostic/1.0"})
                with urllib.request.urlopen(req, timeout=2.5) as resp:
                    elapsed = (time.perf_counter() - t0) * 1000
                    status = resp.status
                    body = resp.read().decode("utf-8", errors="replace")
                    try:
                        data = json.loads(body)
                        # Extract model ids
                        models = []
                        if "data" in data and isinstance(data["data"], list):
                            models = [m.get("id") for m in data["data"] if isinstance(m, dict)]
                        elif "models" in data and isinstance(data["models"], list):
                            models = [m.get("name") or m.get("model") for m in data["models"] if isinstance(m, dict)]
                        model_str = ", ".join(filter(None, models)) or "None found in JSON"
                    except Exception:
                        model_str = f"Raw response ({len(body)} chars)"
                    print(f"[{status}] {url} -> {elapsed:.1f}ms | Models: {model_str}")
            except urllib.error.HTTPError as e:
                elapsed = (time.perf_counter() - t0) * 1000
                print(f"[HTTP {e.code}] {url} -> {elapsed:.1f}ms | Error: {e.reason}")
            except Exception as e:
                elapsed = (time.perf_counter() - t0) * 1000
                print(f"[FAILED] {url} -> {elapsed:.1f}ms | {type(e).__name__}: {e}")

print()

print("=" * 60)
print("3. SENDING TEST CHAT COMPLETION TO CONFIGURED LLM_BASE_URL")
print("=" * 60)
chat_url = f"{llm_base_url.rstrip('/')}/chat/completions"
print(f"Target URL: {chat_url}")

payload = {
    "model": llm_model,
    "messages": [{"role": "user", "content": "Say hi"}],
    "max_tokens": 20,
    "temperature": 0.1,
}
t0 = time.perf_counter()
try:
    req = urllib.request.Request(
        chat_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "Diagnostic/1.0"}
    )
    with urllib.request.urlopen(req, timeout=10.0) as resp:
        elapsed = (time.perf_counter() - t0) * 1000
        status = resp.status
        body = resp.read().decode("utf-8", errors="replace")
        print(f"Status: {status} ({elapsed:.1f}ms)")
        try:
            res_json = json.loads(body)
            msg = res_json.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"Generated text: {repr(msg)}")
            print(f"Full JSON: {json.dumps(res_json, indent=2)}")
        except Exception:
            print(f"Raw body: {body[:300]}")
except Exception as e:
    elapsed = (time.perf_counter() - t0) * 1000
    print(f"Chat completion FAILED ({elapsed:.1f}ms): {type(e).__name__}: {e}")

print()

print("=" * 60)
print("4. PORT 8000 PROCESS & POWERSHELL SCRIPT STATUS")
print("=" * 60)
try:
    # Check netstat for port 8000
    res = subprocess.run(["netstat", "-ano", "-p", "tcp"], capture_output=True, text=True)
    lines_8000 = [l for l in res.stdout.splitlines() if ":8000 " in l]
    if lines_8000:
        print("Listening on port 8000:")
        for l in lines_8000:
            print(f"  {l.strip()}")
    else:
        print("No process is currently listening on port 8000.")
except Exception as e:
    print(f"Error checking netstat: {e}")

try:
    # Check process list for llama-server or start-llm
    res = subprocess.run(["tasklist"], capture_output=True, text=True)
    llama_procs = [l for l in res.stdout.splitlines() if "llama" in l.lower() or "unsloth" in l.lower()]
    if llama_procs:
        print("\nActive llama/unsloth processes:")
        for l in llama_procs:
            print(f"  {l.strip()}")
    else:
        print("\nNo llama-server or unsloth processes found in tasklist.")
except Exception as e:
    print(f"Error checking tasklist: {e}")

print("=" * 60)

