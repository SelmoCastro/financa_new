# Plano: Corrigir bump.sh + Pipeline de ícones confiável

**Data:** 2026-05-02
**Contexto:** Hoje o `bump.sh` falhou repetidamente (mobileVersion desatualizado, `"--notes"` literal nos releaseNotes). O pipeline de ícones também foi frágil (múltiplos scripts, erros de escape, falta de `import os`).

---

## Parte 1: Corrigir bump.sh

### Bugs atuais

1. **`mobileVersion` nunca é atualizado** — O `bump.sh` escreve `version` no `version-meta.json` mas deixa `mobileVersion` na versão anterior. Isso faz o endpoint retornar versões diferentes e potencialmente quebrar o update checker mobile.

2. **`--notes` vira literal `"--notes"`** — Quando o argumento é passado como `--notes "texto"`, o script interpreta o `--notes` como valor literal em vez de separar flag do conteúdo.

3. **Sem validação pós-bump** — Nenhuma verificação de que todos os arquivos foram atualizados consistentemente.

### Correções

**Arquivo:** `scripts/bump.sh`

| Linha | Problema | Correção |
|---|---|---|
| Parse de args | `NOTES="${2:-}"` captura `--notes` literal se for o 2º arg | Usar loop `while [[ $# -gt 0 ]]` com `case` para parsear `--notes` corretamente |
| ~100 | `d.version = '$NEW'` não atualiza `mobileVersion` | Adicionar `d.mobileVersion = '$NEW'` |
| Todos | Sem validação final | Adicionar step de verificação: ler cada arquivo e confirmar que a versão bate |

### Novo código de parse de args

```bash
NOTES=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --notes)
      NOTES="$2"
      shift 2
      ;;
    patch|minor|major)
      BUMP_TYPE="$1"
      shift
      ;;
    *)
      echo "Argumento desconhecido: $1"
      exit 1
      ;;
  esac
done
BUMP_TYPE="${BUMP_TYPE:-patch}"
```

### Correção do bloco version-meta.json

```javascript
d.version = '$NEW';
d.mobileVersion = '$NEW';   // ← ADICIONAR
if ('$NOTES' && '$NOTES' !== '') d.releaseNotes = '$NOTES'.replace(/\\\\n/g, '\\n');
```

### Validação pós-bump

```bash
# Após todas as escritas, verificar consistência
echo ""
echo "🔍 Verificando consistência..."

check_file() {
  local file=$1
  local field=$2
  local expected=$3
  if [[ -f "$file" ]]; then
    actual=$(node -e "console.log(require('./$file').$field || 'N/A')" 2>/dev/null || echo "ERRO")
    if [[ "$actual" != "$expected" ]]; then
      echo "  ❌ $file ($field): esperado=$expected, atual=$actual"
      return 1
    else
      echo "  ✓ $file ($field): $expected"
    fi
  fi
}

check_file "package.json" "version" "$NEW_VERSION"
check_file "backend/package.json" "version" "$NEW_VERSION"
check_file "frontend/package.json" "version" "$NEW_VERSION"
check_file "mobile/package.json" "version" "$NEW_VERSION"
# version-meta.json é lido como JSON puro, não via require
if [[ -f "backend/src/version-meta.json" ]]; then
  vm_ver=$(node -e "console.log(JSON.parse(require('fs').readFileSync('backend/src/version-meta.json','utf8')).version)")
  vm_mob=$(node -e "console.log(JSON.parse(require('fs').readFileSync('backend/src/version-meta.json','utf8')).mobileVersion)")
  [[ "$vm_ver" == "$NEW_VERSION" ]] && echo "  ✓ version-meta.json (version): $NEW_VERSION" || echo "  ❌ version-meta.json (version): esperado=$NEW_VERSION, atual=$vm_ver"
  [[ "$vm_mob" == "$NEW_VERSION" ]] && echo "  ✓ version-meta.json (mobileVersion): $NEW_VERSION" || echo "  ❌ version-meta.json (mobileVersion): esperado=$NEW_VERSION, atual=$vm_mob"
fi
```

### Arquivos afetados

- `scripts/bump.sh` — correção principal
- `backend/src/version-meta.json` — será gerado corretamente da próxima vez

---

## Parte 2: Pipeline de Ícones Confiável

### Problemas de hoje

1. Múltiplos scripts (`generate_icons.py`, `apply_raw_icon.py`, `force_apply_icon.py`, `remix_icon.py`, `apply_new_jpeg_icon.py`) — bagunça
2. Erro de escape `\\\"fade\\\"` no TSX por causa do write_file
3. Falta de `import os` em um script
4. Sempre precisou de ajuste manual de `mobileVersion` depois

### Solução: UM script canônico

**Arquivo:** `scripts/update_icons.py` (substitui todos os anteriores)

**Interface:**
```bash
python3 scripts/update_icons.py <imagem_fonte>
```

**Comportamento:**
1. Detecta o formato (PNG, JPEG, WebP)
2. Converte para RGBA
3. Crop quadrado automático (centro)
4. Gera TODOS os tamanhos necessários em uma passada:
   - `mobile/assets/images/icon.png` (1024x1024)
   - `mobile/assets/images/adaptive-icon.png` (1080x1080)
   - `mobile/assets/images/splash-icon.png` (1080x1080)
   - `mobile/assets/images/favicon.png` (64x64)
   - `frontend/public/favicon.png` (64x64)
   - `frontend/public/logo.png` (512x512)
   - `frontend/public/icon-192.png` (192x192)
   - `frontend/public/icon-512.png` (512x512)
5. Log claro de cada arquivo gerado
6. Retorna exit code 0 se tudo ok, 1 se falhar

**Limpeza:**
- Deletar: `apply_raw_icon.py`, `force_apply_icon.py`, `remix_icon.py`, `apply_new_jpeg_icon.py`, `generate_icons.py`
- Manter apenas: `update_icons.py`

### Arquivos afetados

- `scripts/update_icons.py` — NOVO (script canônico)
- `scripts/apply_raw_icon.py` — DELETAR
- `scripts/force_apply_icon.py` — DELETAR
- `scripts/remix_icon.py` — DELETAR
- `scripts/apply_new_jpeg_icon.py` — DELETAR
- `scripts/generate_icons.py` — DELETAR

---

## Validação

1. Rodar `./scripts/bump.sh patch --notes "teste de bump"` e verificar que `mobileVersion` = `version` no `version-meta.json` e que `releaseNotes` contém "teste de bump" (não "--notes")
2. Rodar `python3 scripts/update_icons.py /caminho/para/icone.png` e verificar todos os 8 arquivos gerados

---

## Riscos

- **bump.sh**: Se o parse de args mudar, scripts que chamam `bump.sh` com a sintaxe antiga (`./scripts/bump.sh patch --notes "texto"`) continuam funcionando (a nova sintaxe é compatível)
- **update_icons.py**: Se a imagem fonte tiver transparência PNG, o crop quadrado pode cortar partes importantes. Mitigação: log avisa as dimensões originais e o crop aplicado
