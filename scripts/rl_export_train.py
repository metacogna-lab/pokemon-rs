#!/usr/bin/env python3
"""
Export RL experience data for offline Gymnasium training.

Usage:
  python scripts/rl_export_train.py --base-url http://localhost:8080/v1 --session-id <UUID> [--output experiences.json]
  python scripts/rl_export_train.py --help

Flow:
  1. Call GET /rl/export?sessionId=<id>&limit=1000&offset=0
  2. Save experiences to JSON (Gymnasium-compatible: state, action, reward, next_state, done)
  3. Downstream: load with `gymnasium` or custom DQN/PPO training loop
"""
import argparse
import json
import sys
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError


def fetch_export(base_url: str, session_id: str, limit: int = 1000, offset: int = 0) -> dict:
    """Fetches experience data from the RL export endpoint."""
    params = {"sessionId": session_id, "limit": limit, "offset": offset}
    url = f"{base_url.rstrip('/')}/rl/export?{urlencode(params)}"
    req = Request(url, headers={"Accept": "application/json"})
    with urlopen(req) as resp:
        return json.loads(resp.read().decode())


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export RL experiences for offline training",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--base-url", default="http://localhost:8080/v1", help="API base URL")
    parser.add_argument("--session-id", required=True, help="Session UUID")
    parser.add_argument("--output", "-o", help="Output JSON file (default: stdout)")
    parser.add_argument("--limit", type=int, default=1000, help="Max experiences to fetch")
    parser.add_argument("--offset", type=int, default=0, help="Offset for pagination")
    args = parser.parse_args()

    try:
        data = fetch_export(args.base_url, args.session_id, args.limit, args.offset)
    except (URLError, HTTPError) as e:
        print(f"Error fetching export: {e}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as e:
        print(f"Error parsing response: {e}", file=sys.stderr)
        return 1

    out = json.dumps(data, indent=2)
    if args.output:
        with open(args.output, "w") as f:
            f.write(out)
        print(f"Wrote {len(data.get('experiences', []))} experiences to {args.output}")
    else:
        print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
