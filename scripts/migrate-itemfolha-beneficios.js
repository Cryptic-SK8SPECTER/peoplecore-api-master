/* eslint-disable no-console */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

const ItemFolha = require('./../models/itemFolhaModel');

async function run() {
  if (!process.env.DATABASE || !process.env.DATABASE_PASSWORD) {
    throw new Error('Variáveis DATABASE e DATABASE_PASSWORD são obrigatórias em config.env');
  }

  const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD,
  );

  await mongoose.connect(DB, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  const dryRun = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';

  const query = {
    $or: [
      { beneficio_transporte_valor: { $exists: false } },
      { beneficio_alimentacao_valor: { $exists: false } },
      { beneficio_transporte_valor: 0 },
      { beneficio_alimentacao_valor: 0 },
    ],
  };

  const totalCandidates = await ItemFolha.countDocuments(query);
  console.log(`[migrate-itemfolha-beneficios] candidatos: ${totalCandidates}`);

  if (dryRun) {
    console.log('[migrate-itemfolha-beneficios] DRY_RUN=true, sem alterações.');
    await mongoose.disconnect();
    return;
  }

  const res = await ItemFolha.updateMany(query, [
    {
      $set: {
        beneficio_transporte_valor: {
          $ifNull: ['$beneficio_transporte_valor', '$subsidio_transporte_valor'],
        },
        beneficio_alimentacao_valor: {
          $ifNull: ['$beneficio_alimentacao_valor', '$subsidio_alimentacao_valor'],
        },
      },
    },
    {
      $set: {
        subsidio_transporte_valor: {
          $ifNull: ['$subsidio_transporte_valor', '$beneficio_transporte_valor'],
        },
        subsidio_alimentacao_valor: {
          $ifNull: ['$subsidio_alimentacao_valor', '$beneficio_alimentacao_valor'],
        },
      },
    },
  ]);

  console.log(
    `[migrate-itemfolha-beneficios] matched=${res.matchedCount || 0} modified=${res.modifiedCount || 0}`,
  );

  await mongoose.disconnect();
}

run()
  .then(() => {
    console.log('[migrate-itemfolha-beneficios] concluído');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[migrate-itemfolha-beneficios] erro:', err.message);
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
    process.exit(1);
  });

