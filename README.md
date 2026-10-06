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

## Publicação no site do produto (para os devs)

A página é estática: `index.html` + a pasta `assets/`. Não tem build nem dependências.

- **Onde colocar:** copie `index.html` e `assets/` juntos para a rota escolhida (ex.: `/parceiros/`). Os caminhos são relativos, então a pasta `assets/` precisa ficar ao lado do `index.html`. Se o site for em framework (Next, Nuxt etc.), sirva os arquivos como estáticos (ex.: `public/parceiros/`).
- **Formulário:** envia `POST` com `Content-Type: text/plain` para o Web App do Apps Script definido em `FORM_ENDPOINT` (`assets/js/main.js`). Não precisa de backend do lado do site.
- **Content Security Policy:** se o site tiver CSP, libere:
  - `connect-src https://script.google.com https://script.googleusercontent.com` (envio do formulário; o Apps Script responde com redirect para o segundo domínio)
  - `style-src https://fonts.googleapis.com` e `font-src https://fonts.gstatic.com` (fontes Barlow Condensed e DM Sans)
- **Prévia de link (WhatsApp, Instagram):** troque `og:image` em `index.html` pela URL absoluta da imagem no domínio final (ex.: `https://chute.com.br/parceiros/assets/img/app-icon.webp`) e adicione `<meta property="og:url">` com a URL da página.
- **Scripts de analytics ou pixel:** se forem adicionados, use o mesmo `index.html`; nada no JS da página depende deles.
- **Teste depois de publicar:** envie uma inscrição pela página e confira a linha na aba Inscrições da planilha (`crm_status` = `enviado`).
