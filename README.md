# Тише в цифре

Публичная сайт-памятка о цифровом шуме и настройках цифровой среды. Страница не собирает и не отправляет отметки пользователя: чек-лист работает только в браузере.

Оформление автоматически следует системной светлой или тёмной теме устройства.

- Сайт: https://vdepo.github.io/digital-noise-guide/
- Репозиторий: https://github.com/vdepo/digital-noise-guide

## Как обновить сайт через Git

1. Склонируйте репозиторий и перейдите в его папку:

   ```bash
   git clone https://github.com/vdepo/digital-noise-guide.git
   cd digital-noise-guide
   ```

2. Замените `index.html` новой версией и сохраните изменения.
3. Отправьте обновление:

   ```bash
   git add index.html README.md
   git commit -m "Update digital noise guide"
   git push
   ```

GitHub Pages автоматически опубликует обновление из ветки `main`.
