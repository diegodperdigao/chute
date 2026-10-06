# Chute Parceiros

Landing page de captação de parceiros do Chute, o fantasy pick'em da 3C Picks.
HTML, CSS e JS puros, sem build.

```
index.html            página
assets/css/style.css  estilos e animações
assets/js/main.js     formulário (validação, máscara de WhatsApp, envio) e animações
assets/img/           logo e mascote (webp)
integracoes/          Apps Script que grava na planilha e envia ao CRM
```

Para ver localmente: `python3 -m http.server` na raiz e abrir http://localhost:8000.

## Formulário

As inscrições vão para uma planilha do Google e para o CRM por meio de um Google Apps Script.
O passo a passo de instalação está em [`integracoes/README.md`](integracoes/README.md).

O formulário envia para o Web App configurado em `FORM_ENDPOINT`, no topo de `assets/js/main.js`.
Se o script for reimplantado como uma implantação nova (URL nova), atualize esse valor.
