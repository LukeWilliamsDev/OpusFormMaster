# Local & External Secure Hosting Configuration Guide

This guide details how to host and run your local server dashboard securely, ensuring all network traffic (local loopback and external connections) is fully encrypted using SSL/TLS.

---

## 1. Local Development SSL (Loopback Encryption)

When running the dashboard locally on `localhost` or `127.0.0.1` and querying local endpoints, browsers may restrict security features (like secure cookies or service workers) unless SSL is active.

### Generating Trusted Local Certificates with `mkcert`
`mkcert` is a simple tool for making locally-trusted development certificates. It requires no configuration.

1. **Install `mkcert`**:
   * **Windows (via Chocolatey or Scoop)**:
     ```powershell
     choco install mkcert
     # or
     scoop install mkcert
     ```
2. **Create the Local Root CA**:
   ```powershell
   mkcert -install
   ```
3. **Generate a Certificate for localhost**:
   Navigate to your project root folder and run:
   ```powershell
   mkcert localhost 127.0.0.1 ::1
   ```
   This generates `localhost.pem` (certificate) and `localhost-key.pem` (private key).

4. **Configure Vite to Use local SSL**:
   Modify your `vite.config.ts` to include the credentials:
   ```typescript
   import { defineConfig } from 'vite';
   import fs from 'fs';

   export default defineConfig({
     server: {
       https: {
         key: fs.readFileSync('./localhost-key.pem'),
         cert: fs.readFileSync('./localhost.pem'),
       },
       port: 5173
     }
   });
   ```

---

## 2. Setting Up a Reverse Proxy (Production & LAN Access)

If you are hosting the dashboard on a home server (e.g. Raspberry Pi, local PC) to access it across your local network (LAN) or bind it to a local domain name, use a reverse proxy to manage SSL.

### Option A: Caddy Server (Simplest, Automatic SSL)
Caddy automatically obtains and renews TLS/SSL certificates from Let's Encrypt, or uses its own internal CA for local domains.

1. Install Caddy on your hosting machine.
2. Create a file named `Caddyfile` in your server directory:
   ```caddyfile
   # For a local network domain name (uses Caddy's internal CA)
   dashboard.local {
       reverse_proxy localhost:8788
   }

   # For a public domain name (automatic Let's Encrypt HTTP-01 SSL challenge)
   yourdomain.com {
       reverse_proxy localhost:8788
   }
   ```
3. Start the server:
   ```bash
   caddy run
   ```

### Option B: Nginx Configuration
If you prefer Nginx, use this configuration template to forward requests securely.

```nginx
server {
    listen 443 ssl http2;
    server_name dashboard.local yourdomain.com;

    # SSL Certificates
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # Recommended Secure TLS Protocols & Ciphers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy Configuration
    location / {
        proxy_pass http://localhost:8788;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

# Redirect HTTP (80) traffic to HTTPS (443)
server {
    listen 80;
    server_name dashboard.local yourdomain.com;
    return 301 https://$host$request_uri;
}
```

---

## 3. Cloudflare Tunnels (Secure External Exposing)

To access your locally hosted server dashboard externally *without* exposing ports on your home router (no port forwarding) and protecting it behind Cloudflare's WAF (Web Application Firewall):

1. **Install `cloudflared`** on your local hosting server:
   * **Windows (via winget)**:
     ```powershell
     winget install Cloudflare.cloudflared
     ```
2. **Authenticate the CLI**:
   ```bash
   cloudflared tunnel login
   ```
3. **Create the Tunnel**:
   ```bash
   cloudflared tunnel create local-dashboard-tunnel
   ```
4. **Configure the Tunnel**:
   Create a configuration file `config.yml` in your `cloudflared` directory (typically `~/.cloudflared/`):
   ```yaml
   tunnel: <your-tunnel-uuid>
   credentials-file: /path/to/credentials.json

   ingress:
     - hostname: dashboard.yourdomain.com
       service: http://localhost:8788
     - service: http_status:404
   ```
5. **Route DNS**:
   Link your hostname to the tunnel in Cloudflare dashboard DNS settings:
   ```bash
   cloudflared tunnel route dns local-dashboard-tunnel dashboard.yourdomain.com
   ```
6. **Start the Tunnel**:
   ```bash
   cloudflared tunnel run local-dashboard-tunnel
   ```
Now your server dashboard will be securely exposed at `https://dashboard.yourdomain.com` with a valid SSL certificate managed by Cloudflare, bypassing local firewall exposure.
