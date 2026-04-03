import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const newCategories = [
  { name: 'Cuidados com Pets', type: 'EXPENSE', color: '#8b5cf6', icon: '🐾' },
  { name: 'Combustível / Gasolina', type: 'EXPENSE', color: '#064e3b', icon: '⛽' },
  { name: 'Manutenção Veicular', type: 'EXPENSE', color: '#111827', icon: '🔧' },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(dryRun ? '🔍 MODO DRY-RUN ATIVADO' : '🚀 MODO EXECUÇÃO ATIVADO');

  const users = await prisma.user.findMany({
    include: { categories: true },
  });

  console.log(`Total de usuários para processar: ${users.length}`);

  for (const user of users) {
    console.log(`\nProcessando usuário: ${user.email} (${user.id})`);
    
    for (const cat of newCategories) {
      const exists = user.categories.some(c => c.name === cat.name && c.type === cat.type);
      
      if (!exists) {
        if (dryRun) {
          console.log(`  [SIMULAÇÃO] Criar categoria: ${cat.name}`);
        } else {
          try {
            await prisma.category.create({
              data: {
                ...cat,
                userId: user.id,
              },
            });
            console.log(`  [SUCESSO] Criada categoria: ${cat.name}`);
          } catch (error) {
            console.error(`  [ERRO] Falha ao criar categoria ${cat.name}:`, error.message);
          }
        }
      } else {
        console.log(`  [OK] Categoria já existe: ${cat.name}`);
      }
    }
  }

  console.log('\n✅ Processamento concluído.');
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
