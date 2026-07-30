import http.server
import socketserver

PORT = 3000
Handler = http.server.SimpleHTTPRequestHandler

# Explicitly map CSS and JS files to bypass any Windows registry corruptions
Handler.extensions_map.update({
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.html': 'text/html',
})

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving frontend at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
        httpd.server_close()
