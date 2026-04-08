echo ""
echo "=== MEMO PWA — Настройка VAPID-ключей ==="
echo ""

# Генерируем ключи
KEYS=$(npx web-push generate-vapid-keys --json 2>/dev/null)

if [ -z "$KEYS" ]; then
  echo "❌ Ошибка генерации ключей. Убедись что web-push установлен (npm install)"
  exit 1
fi

# Извлекаем ключи
PUBLIC_KEY=$(echo $KEYS | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const k=JSON.parse(d); process.stdout.write(k.publicKey)")
PRIVATE_KEY=$(echo $KEYS | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const k=JSON.parse(d); process.stdout.write(k.privateKey)")

echo "✅ Публичный ключ:  $PUBLIC_KEY"
echo "✅ Приватный ключ:  $PRIVATE_KEY"
echo ""

# Подставляем в server.js
sed -i.bak \
  "s|VAPID_PUBLIC_KEY_PLACEHOLDER|$PUBLIC_KEY|g; s|VAPID_PRIVATE_KEY_PLACEHOLDER|$PRIVATE_KEY|g" \
  server.js

# Подставляем публичный ключ в app.js
sed -i.bak \
  "s|VAPID_PUBLIC_KEY_PLACEHOLDER|$PUBLIC_KEY|g" \
  app.js

# Удаляем backup-файлы
rm -f server.js.bak app.js.bak

echo "✅ Ключи вставлены в server.js и app.js"
echo ""
echo "=== Следующий шаг: настройка HTTPS ==="
echo ""
echo "Выполни следующие команды (один раз):"
echo ""
echo "  brew install mkcert         # если ещё не установлен"
echo "  mkcert -install             # устанавливаем корневой CA"
echo "  mkcert localhost 127.0.0.1 ::1  # генерируем сертификаты"
echo ""
echo "Затем запусти сервер:"
echo "  node server.js"
echo ""
echo "Откроется по адресу: https://localhost:3001"
echo ""
