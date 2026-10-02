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

Depois de publicar o script, cole a URL `/exec` em `FORM_ENDPOINT`, no topo de `assets/js/main.js`.
**Enquanto `FORM_ENDPOINT` estiver vazio, o formulário apenas simula o envio e nada é salvo.**
