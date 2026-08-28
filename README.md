# ✨ Translucid OpenWork — Apple Liquid Glass & Full Customization

> **Personalização Oficial Translúcida no estilo macOS Apple Liquid Glass + Efeitos Visuais para o OpenWork.**

---

## 💎 Visão Geral

O **Translucid OpenWork** transforma a interface do [OpenWork](https://openwork.app) em uma experiência nativa de vidro líquido translúcido estilo macOS Sonoma / Sequoia, com desfoque profundo (*backdrop-filter: blur*), suporte a Apple Vibrancy por hardware (Metal GPU) e integração nativa com o Dashboard Local.

---

## 🚀 Como Aplicar em 1 Clique (Instalação ou Reinstalação)

Após cada atualização do OpenWork ou formatação do sistema, basta abrir o terminal nesta pasta e executar:

```bash
chmod +x apply-translucid.sh
./apply-translucid.sh
```

### O que o script faz automaticamente:
1. **Backup Automático**: Cria cópia de segurança do `app.asar` original em `app.asar.backup`.
2. **Injeção de Liquid Glass**: Aplica regras de transparência de alta performance sem comprometer a legibilidade.
3. **Apple Vibrancy**: Ativa transparência nativa da janela via Electron BrowserWindow no macOS.
4. **Botão Dashboard Integrado**: Adiciona atalho direto para o Control Center local.
5. **Assinatura & Gatekeeper**: Remove quarentena do macOS e aplica assinatura ad-hoc segura.
6. **Reinicialização Imediata**: Abre o OpenWork já personalizado.

---

## 🎨 Restaurar Original

Caso queira voltar à versão padrão do OpenWork a qualquer momento:

```bash
chmod +x restore-original.sh
./restore-original.sh
```

---

## 📊 Dashboard de Controle Local

Para rodar a central de controle e monitoramento visual:

```bash
chmod +x start-dashboard.sh
./start-dashboard.sh
```
Acesse no seu navegador: **[http://localhost:3030/](http://localhost:3030/)**

---

## 🔤 Fontes Profissionais Recomendadas

Para instalar as melhores fontes tipográficas (*JetBrains Mono*, *Fira Code*, *SF Pro*, *Inter*):

```bash
chmod +x install-pro-fonts.sh
./install-pro-fonts.sh
```

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais detalhes.
