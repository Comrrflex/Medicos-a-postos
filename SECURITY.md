# Segurança e privacidade

Este repositório é uma base técnica e ainda não representa, sozinho, conformidade com a LGPD ou com normas de prontuário médico.

## Controles já implementados

- Senhas derivadas com `scrypt`, salt individual e comparação em tempo constante.
- Tokens de sessão aleatórios; somente o SHA-256 do token é persistido.
- Expiração de sessão configurável e logout com revogação.
- Isolamento de casos e auditoria por clínica.
- Perfis `admin` e `profissional`.
- Limite de tentativas de login por instância.
- Validação de tamanho do JSON e dos campos.
- Consultas SQL parametrizadas e respostas sem erros internos do banco.

## Antes de produção

- Usar HTTPS obrigatório e uma plataforma com backups criptografados.
- Migrar de SQLite para PostgreSQL gerenciado se houver múltiplas instâncias.
- Trocar o limitador em memória por um armazenamento compartilhado, como Redis.
- Definir retenção, correção, exportação e eliminação de dados pessoais.
- Adicionar MFA, recuperação de senha e política de revogação administrativa.
- Realizar avaliação jurídica e de segurança específica para dados de saúde.
- Não usar nomes ou dados clínicos reais em homologação.
