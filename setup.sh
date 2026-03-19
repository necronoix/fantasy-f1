#!/bin/bash
# ============================================================
# Fantasy F1 - Setup automatico per collaboratori
# ============================================================
# Esegui questo script dopo aver clonato il repo:
#   git clone https://github.com/necronoix/fantasy-f1.git
#   cd fantasy-f1
#   chmod +x setup.sh && ./setup.sh
# ============================================================

echo ""
echo "🏎️  Fantasy F1 — Setup automatico"
echo "=================================="
echo ""

# 1. Crea .env.local
echo "📝 Creazione file .env.local..."
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=https://hgxbiqqopbjtjsymejfn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJpcXFvcGJqdGpzeW1lamZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjUwMzgsImV4cCI6MjA4ODMwMTAzOH0.pKxSbqVLiSJeUPzAC5ed3HLxdHK-CXViLdAOKMwGDZM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJpcXFvcGJqdGpzeW1lamZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcyNTAzOCwiZXhwIjoyMDg4MzAxMDM4fQ.xrMPUnub1NbvZIcbkmgrVF1jMjmqn34xwj5AKha0A6Y
NEXT_PUBLIC_APP_URL=https://fantasy-f1-git.vercel.app
ENVEOF
echo "   ✅ .env.local creato"

# 2. Installa dipendenze
echo ""
echo "📦 Installazione dipendenze npm..."
npm install
echo "   ✅ Dipendenze installate"

# 3. Verifica build
echo ""
echo "🔨 Test build..."
npx next build 2>&1 | tail -5
echo ""

echo "=================================="
echo "✅ Setup completato!"
echo ""
echo "Comandi utili:"
echo "  npm run dev          → Avvia in locale (http://localhost:3000)"
echo "  npm run build        → Build di produzione"
echo ""
echo "Deploy su Vercel (produzione):"
echo "  npx vercel@latest deploy --token <VERCEL_TOKEN> --scope team_h8BJwWiABvFRx3AWsftZMCDJ --prod --yes"
echo "  (chiedi il token Vercel al proprietario del progetto)"
echo ""
echo "🏎️  Buon lavoro!"
