# Тише в цифре

Одностраничный статический сайт-памятка для индивидуального проекта. Сайт не собирает и не отправляет отметки пользователя: чек-лист работает только в браузере.

## Локальный просмотр

Откройте `index.html` в браузере.

## Публикация на GitHub Pages

1. Создайте на GitHub новый публичный репозиторий, например `digital-noise-guide`.
2. Загрузите в корень репозитория файл `index.html` и этот `README.md`.
3. Откройте в репозитории **Settings → Pages**.
4. В разделе **Build and deployment** выберите **Deploy from a branch**, ветку `main`, папку `/ (root)`, затем нажмите **Save**.
5. Подождите, пока GitHub Pages опубликует страницу. Адрес появится в разделе **Settings → Pages** и будет выглядеть примерно так: `https://ВАШ-ЛОГИН.github.io/digital-noise-guide/`.

Для загрузки через Git в Терминале:

```bash
git clone https://github.com/ВАШ-ЛОГИН/digital-noise-guide.git
cd digital-noise-guide
# скопируйте index.html и README.md в эту папку
git add index.html README.md
git commit -m "Add digital noise guide"
git push -u origin main
```

Если GitHub создаст репозиторий без ветки `main`, выполните `git branch -M main` перед `git push`.
