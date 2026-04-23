# TODO - Verificar após deploy v1.6.5

Data: 2026-04-23

## Pendências

### 1. Commit + push das alterações do mobile
- `mobile/hooks/useUpdateChecker.ts` — path corrigido para `/v1/app/version`
- Arquivos ainda não commitados após a correção do path

### 2. Build APK v1.6.5 via EAS
```bash
cd /run/media/selmo/HDBarracuda/Projetos/Financa_new/mobile
npx eas build --platform android --profile preview
```

### 3. Upload do APK para VPS
Após o build completar, baixar o APK e subir:
```bash
# Copiar APK baixado para VPS
scp <apk_local> root@2.24.211.92:/tmp/finanza-1.6.5.apk

# No VPS:
ssh root@2.24.211.92
cp /tmp/finanza-1.6.5.apk /var/www/finanzaai.tech/downloads/Financa_new_v1.6.5.apk
ln -sf /var/www/finanzaai.tech/downloads/Financa_new_v1.6.5.apk /var/www/finanzaai.tech/downloads/Financa_new.apk
```

### 4. Testar o fluxo de update no celular
- Instalar APK v1.6.5 no celular
- Verificar se o dialog de atualização NAO aparece (versões iguais)
- Depois subir a versão no backend para 1.6.6 (só no package.json do VPS) para testar se o dialog aparece
- Testar botão "Baixar" → deve abrir browser com download do APK
- Testar botão "Depois" → deve fechar o dialog

### 5. Atualizar release notes no VPS (opcional, sem redeploy)
```bash
ssh root@2.24.211.92
# Editar direto no dist para efeito imediato:
vi /opt/finanza/backend/dist/version-meta.json
# Depois sincronizar com src também:
cp /opt/finanza/backend/dist/version-meta.json /opt/finanza/backend/src/version-meta.json
```

### 6. Desbloquear conta s.elmo@live.com (se ainda bloqueada)
```bash
ssh root@2.24.211.92
docker exec finanza-postgres psql -U finanza -d finanza -c \
  "UPDATE \"User\" SET \"failedLoginAttempts\"=0, \"lockedUntil\"=NULL WHERE email='s.elmo@live.com';"
```

## Referência rápida

| Item | Valor |
|------|-------|
| Endpoint versão | `GET https://finanzaai.tech/api/v1/app/version` |
| Versão atual deployada | 1.6.5 |
| APK URL base | `https://finanzaai.tech/downloads/Financa_new_v{VERSION}.apk` |
| Symlink latest | `https://finanzaai.tech/downloads/Financa_new.apk` |
| version-meta.json (VPS) | `/opt/finanza/backend/src/version-meta.json` e `/opt/finanza/backend/dist/version-meta.json` |
| VPS IP | 2.24.211.92 |