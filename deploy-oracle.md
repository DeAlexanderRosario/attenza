# 🚀 Deploy Socket Server on Oracle Cloud Ubuntu

## Architecture
```
Vercel (Frontend) ←→ Oracle Cloud Ubuntu (Socket Server + WhatsApp)
                 ↕
           MongoDB Atlas
```

## 1. SSH into Oracle VM
```bash
ssh -i "your-key.key" ubuntu@<ORACLE_IP>
```

## 2. Install Node.js 18+
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # Should be 18+
```

## 3. Clone & Install
```bash
git clone https://github.com/DeAlexanderRosario/truecheck.git
cd truecheck
npm install
```

## 4. Create `.env` on Oracle VM
```bash
nano .env
```
```env
MONGODB_URI="mongodb+srv://...your_atlas_uri..."
SOCKET_PORT=3001
```

## 5. Open Port 3001

### A. Oracle Cloud Security List (OCI Console)
- **Networking → VCN → Subnet → Security List → Add Ingress Rule**
  - Source CIDR: `0.0.0.0/0`
  - Protocol: TCP
  - Port: `3001`

### B. Ubuntu Firewall
```bash
sudo iptables -I INPUT -p tcp --dport 3001 -j ACCEPT
sudo apt install -y netfilter-persistent
sudo netfilter-persistent save
```

## 6. Run with PM2 (keeps running after SSH disconnect)
```bash
sudo npm install -g pm2
pm2 start "npx tsx socket-server.ts" --name truecheck-socket
pm2 save
pm2 startup  # Auto-start on reboot
```

## 7. Set Vercel Environment Variables
Go to **Vercel Dashboard → Project → Settings → Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SOCKET_URL` | `http://<ORACLE_IP>:3001` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `MONGODB_URI` | `mongodb+srv://...` |

Then **redeploy** the Vercel project.

## 8. Verify
- Frontend on Vercel should show "Live" indicator (socket connected)
- Hardware device should connect to `ws://<ORACLE_IP>:3001/ws`
- WhatsApp QR code will appear in PM2 logs: `pm2 logs truecheck-socket`

## Useful PM2 Commands
```bash
pm2 logs truecheck-socket   # View logs (WhatsApp QR shows here)
pm2 restart truecheck-socket # Restart server
pm2 status                   # Check if running
```
