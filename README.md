# Chute Parceiros

Landing page de captação de parceiros do Chute, o fantasy pick'em da 3C Picks.
HTML, CSS e JS puros, sem build.

```
index.html            página
assets/css/style.css  estilos e animações
assets/js/main.js     formulário (validação, máscara de WhatsApp, envio) e animações
assets/img/           logo e mascote (webp)
```

Para ver localmente: `python3 -m http.server` na raiz e abrir http://localhost:8000.

## Formulário

O envio é um `POST` com JSON para `FORM_ENDPOINT`, no topo de `assets/js/main.js`:

```json
{ "nome": "", "email": "", "whatsapp": "11912345678", "perfil": "@perfil", "aceite_termos": true,
  "origem": "https://...", "enviado_em": "2026-10-02T19:00:00.000Z",
  "utm_source": "...", "utm_campaign": "..." }
```

UTMs (`utm_*`) e `ref` da URL entram automaticamente. **Enquanto `FORM_ENDPOINT` estiver vazio,
o formulário apenas simula o envio e nada é salvo.**
