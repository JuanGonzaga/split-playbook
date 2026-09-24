# Split Playbook

Projeto estático, sem PHP ou dependências.

## Abrir localmente

Abra `index.html` no navegador. Se o navegador restringir algum recurso local, execute:

```bash
cd ~/Desktop/split-playbook
python3 -m http.server 8765
```

E acesse `http://localhost:8765`.

## Usar no CodePen

- HTML: cole o conteúdo interno do `body` de `index.html` (sem as tags `script` e `link`).
- CSS: cole todo o conteúdo de `styles.css`.
- JS: cole todo o conteúdo de `script.js`.

O checklist usa `localStorage`, portanto as marcações permanecem salvas no mesmo navegador.
