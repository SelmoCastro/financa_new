-- Relatório de transações por usuário (Decrescente)
-- PostgreSQL / Prisma Format

SELECT 
    u.name AS "Nome", 
    u.email AS "Email", 
    COUNT(t.id) AS "Qtd_Transacoes"
FROM "User" u
LEFT JOIN "Transaction" t ON u.id = t."userId"
GROUP BY u.id, u.name, u.email
ORDER BY "Qtd_Transacoes" DESC;
