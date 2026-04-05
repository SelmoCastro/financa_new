#!/bin/bash

# ============================================================
# Financa - Script de Inicialização Local
# ============================================================

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
MOBILE_DIR="$PROJECT_ROOT/mobile"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()      { echo -e "${BLUE}[INFO]${NC} $1"; }
success()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn()     { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()    { echo -e "${RED}[ERRO]${NC} $1"; }

# ============================================================
# Menu
# ============================================================
echo -e "${BLUE}"
echo "============================================"
echo "   Financa - Inicialização Local"
echo "============================================"
echo -e "${NC}"
echo "1. Iniciar Backend + Frontend"
echo "2. Iniciar apenas Backend"
echo "3. Iniciar apenas Frontend"
echo "4. Iniciar Backend + Frontend + Mobile"
echo "5. Instalar dependências de tudo"
echo "6. Setup completo (install + migrate + start)"
echo ""
read -p "Escolha uma opção [1-6]: " OPTION

# ============================================================
# Funções
# ============================================================

install_deps() {
    log "Instalando dependências do backend..."
    cd "$BACKEND_DIR" && npm install || { error "Falha ao instalar backend"; exit 1; }
    success "Backend instalado"

    log "Instalando dependências do frontend..."
    cd "$FRONTEND_DIR" && npm install || { error "Falha ao instalar frontend"; exit 1; }
    success "Frontend instalado"

    log "Instalando dependências do mobile..."
    cd "$MOBILE_DIR" && npm install || { error "Falha ao instalar mobile"; exit 1; }
    success "Mobile instalado"
}

setup_db() {
    log "Gerando Prisma Client..."
    cd "$BACKEND_DIR" && npx prisma generate || { error "Falha no prisma generate"; exit 1; }
    success "Prisma Client gerado"

    log "Rodando migrações..."
    npx prisma migrate dev --name auto || { error "Falha nas migrações"; exit 1; }
    success "Migrações aplicadas"
}

start_backend() {
    log "Iniciando backend..."
    cd "$BACKEND_DIR"
    npm run start:dev &
    BACKEND_PID=$!
    success "Backend iniciado (PID: $BACKEND_PID)"
    echo -e "  ${YELLOW}API: http://localhost:3000${NC}"
    echo -e "  ${YELLOW}Swagger: http://localhost:3000/api/docs${NC}"
}

start_frontend() {
    log "Iniciando frontend..."
    cd "$FRONTEND_DIR"
    npm run dev &
    FRONTEND_PID=$!
    success "Frontend iniciado (PID: $FRONTEND_PID)"
    echo -e "  ${YELLOW}Frontend: http://localhost:5173${NC}"
}

start_mobile() {
    log "Iniciando mobile (Expo)..."
    cd "$MOBILE_DIR"
    npm start &
    MOBILE_PID=$!
    success "Mobile iniciado (PID: $MOBILE_PID)"
}

cleanup() {
    echo ""
    log "Encerrando serviços..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    kill $MOBILE_PID 2>/dev/null
    kill $(lsof -ti:3000) 2>/dev/null
    kill $(lsof -ti:5173) 2>/dev/null
    success "Serviços encerrados"
    exit 0
}

trap cleanup SIGINT SIGTERM

# ============================================================
# Limpar portas antes de iniciar
# ============================================================
kill_port() {
    local port=$1
    local pid
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        warn "Porta $port já em uso (PID: $pid). Encerrando..."
        kill $pid 2>/dev/null
        sleep 1
        pid=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$pid" ]; then
            kill -9 $pid 2>/dev/null
            sleep 1
        fi
        success "Porta $port liberada"
    fi
}

# ============================================================
# Execução
# ============================================================

# Limpa portas antes de qualquer coisa
kill_port 3000
kill_port 5173
kill_port 8081

case $OPTION in
    1)
        start_backend
        sleep 2
        start_frontend
        ;;
    2)
        start_backend
        ;;
    3)
        start_frontend
        ;;
    4)
        start_backend
        sleep 2
        start_frontend
        sleep 2
        start_mobile
        ;;
    5)
        install_deps
        exit 0
        ;;
    6)
        install_deps
        setup_db
        start_backend
        sleep 2
        start_frontend
        ;;
    *)
        error "Opção inválida"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Todos os serviços foram iniciados!${NC}"
echo -e "${GREEN}  Pressione Ctrl+C para encerrar${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

wait
