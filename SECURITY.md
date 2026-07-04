# Security Policy

## Supported Versions

The latest `main` branch is supported.

## Reporting Security Issues

Do not open public GitHub issues for secrets, authentication bypasses, or data exposure bugs.

Contact the maintainer listed in `SUPPORT.md` with:

- A short description
- Steps to reproduce
- Impact
- Suggested fix, if available

## Secret Handling

Never commit:

- `.env` files
- WhatsApp session folders
- SQLite database files
- Uploaded user files
- API keys or access tokens

Use `backend/.env.example` and `frontend/.env.example` as templates.

## Responsible Use Notice

This project uses Baileys for WhatsApp automation and is not affiliated with WhatsApp. Baileys and this project's maintainers cannot be held liable for misuse. Do not use this software for spam, stalkerware, abusive bulk messaging, scraping, or any activity that violates WhatsApp Terms of Service or local law.
