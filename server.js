const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cron = require('node-cron');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.stack);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(DB, {
    // Mongoose 8+ já usa as novas opções por padrão
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log('DB connection successful!'))
  .catch((err) => {
    console.error('DB connection error:', err);
    process.exit(1);
  });

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

const runExpirySync = async () => {
  try {
    const Empresa = require('./models/empresaModel');
    const Subempresa = require('./models/subempresaModel');
    const now = new Date();

    const [empresasExpiradas, subempresasExpiradas] = await Promise.all([
      Empresa.updateMany(
        {
          prazo_uso_ate: { $ne: null, $lt: now },
          $or: [{ status: { $ne: 'Expirado' } }, { ativo: true }],
        },
        { $set: { status: 'Expirado', ativo: false } },
      ),
      Subempresa.updateMany(
        {
          prazo_uso_ate: { $ne: null, $lt: now },
          $or: [{ status: { $ne: 'Expirado' } }, { ativo: true }],
        },
        { $set: { status: 'Expirado', ativo: false } },
      ),
    ]);

    const e = empresasExpiradas.modifiedCount || 0;
    const s = subempresasExpiradas.modifiedCount || 0;
    if (e > 0 || s > 0) {
      console.log(`[expiry-sync] Empresas expiradas: ${e} | Sub-empresas expiradas: ${s}`);
    }
  } catch (err) {
    console.error('[expiry-sync] erro ao sincronizar expiração:', err.message);
  }
};

// run once at boot
runExpirySync();

// then run hourly
cron.schedule('0 * * * *', async () => {
  console.log('[expiry-sync] execução agendada');
  await runExpirySync();
});

// Cron job para marcar faltas automaticamente às 18:00 todos os dias
cron.schedule('0 18 * * *', async () => {
  console.log('Executando job de marcação automática de faltas...');

  try {
    const Empresa = require('./models/empresaModel');
    const Funcionario = require('./models/funcionarioModel');
    const Presenca = require('./models/presencaModel');
    const Falta = require('./models/faltaModel');
    const { getAttendanceEligibility } = require('./utils/attendanceEligibility');

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const empresas = await Empresa.find({
      ativo: true,
      status: { $ne: 'Expirado' },
    });

    for (const empresa of empresas) {
      // Verificar se já passou do horário de saída da empresa
      const [horaSaida, minSaida] = empresa.horario_saida
        .split(':')
        .map(Number);
      const horarioSaida = new Date();
      horarioSaida.setHours(horaSaida, minSaida, 0, 0);

      if (new Date() < horarioSaida) {
        console.log(
          `Pulando empresa ${empresa.nome}: horário de saída ainda não chegou.`,
        );
        continue;
      }

      const funcionarios = await Funcionario.find({
        empresa_id: empresa._id,
      }).select('_id nome');

      for (const func of funcionarios) {
        const eligibility = await getAttendanceEligibility({
          funcionarioId: func._id,
          empresaId: empresa._id,
          date: hoje,
        });
        if (!eligibility.shouldCreateAbsence) continue;

        const presencaExistente = await Presenca.findOne({
          funcionario_id: func._id,
          data: hoje,
        });

        if (!presencaExistente) {
          // Verificar se já existe falta para hoje
          const faltaExistente = await Falta.findOne({
            funcionario_id: func._id,
            data: hoje,
          });

          if (!faltaExistente) {
            await Falta.create({
              funcionario_id: func._id,
              data: hoje,
              tipo: 'Não Justificada',
              justificada: false,
              motivo: 'Ausência automática detectada',
            });
            console.log(
              `Falta criada para ${func.nome} na empresa ${empresa.nome}`,
            );
          }
        }
      }
    }

    console.log('Job de faltas concluído.');
  } catch (err) {
    console.error('Erro no job de faltas:', err);
  }
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.stack);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});
