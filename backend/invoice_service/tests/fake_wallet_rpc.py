"""A small stand-in for nerva-wallet-rpc, for automated tests.

The real wallet rpc needs the nerva blockchain and a wallet file, neither of
which exists on a test runner. The invoice service only talks to it through
create_address when an invoice is made, so a plain http server that answers
JSON-RPC calls the same way is enough for the whole checkout flow to run.

Run it with:
    python3 tests/fake_wallet_rpc.py [port]
The default port is 28082, same as the real thing.
"""
import json
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from itertools import count


class FakeWalletHandler(BaseHTTPRequestHandler):
    """Answers the json_rpc calls the invoice service makes."""

    def do_POST(self):
        if self.path != "/json_rpc":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", 0))
        payload = json.loads(self.rfile.read(length) or b"{}")

        method = payload.get("method", "")
        params = payload.get("params", {}) or {}

        if method == "create_address":
            index = next(self.server.address_counter)
            # looks like a nerva address: NV prefix, 95 base-ish chars, unique per call
            address = "NV" + format(index, "095x")
            result = {
                "address": address,
                "account_index": params.get("account_index", 0),
                "address_index": index,
                "label": params.get("label", ""),
            }
        else:
            # unknown calls get an empty result, same as a wallet that has no answer
            result = {}

        body = json.dumps({
            "id": payload.get("id", 0),
            "jsonrpc": "2.0",
            "result": result,
        }).encode()

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        # keep test output readable, the wallet is not what we are testing
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 28082
    server = HTTPServer(("127.0.0.1", port), FakeWalletHandler)
    server.address_counter = count()
    print(f"fake wallet rpc listening on 127.0.0.1:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
