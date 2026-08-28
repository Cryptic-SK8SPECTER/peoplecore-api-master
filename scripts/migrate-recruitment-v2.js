/**
 * Migra candidatos legacy (com vaga_id) para o modelo Candidatura v2.
 * Uso: node scripts/migrate-recruitment-v2.js
 */
const dns = require('dns');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.join(__dirname, '../config.env') });

const Candidato = require('../models/candidatoModel');
const Candidatura = require('../models/candidaturaModel');
const { LEGACY_CANDIDATO_STATUS_MAP } = require('../utils/recruitmentConstants');

const DB = process.env.DATABASE?.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

async function main() {
  if (!DB) {
    console.error('DATABASE não configurada');
    process.exit(1);
  }

  await mongoose.connect(DB);
  console.log('Ligado à base de dados.');

  const candidatos = await Candidato.find({ vaga_id: { $ne: null } });
  let criadas = 0;
  let ignoradas = 0;

  for (const candidato of candidatos) {
    const existe = await Candidatura.findOne({
      vaga_id: candidato.vaga_id,
      candidato_id: candidato._id,
    });

    if (existe) {
      ignoradas += 1;
      continue;
    }

    const status =
      LEGACY_CANDIDATO_STATUS_MAP[candidato.status] || 'novo';

    await Candidatura.create({
      vaga_id: candidato.vaga_id,
      candidato_id: candidato._id,
      status,
      data_candidatura: candidato.data_aplicacao || candidato.createdAt,
      historico_estados: [
        {
          de: null,
          para: status,
          motivo: 'migração v2',
          data: new Date(),
        },
      ],
    });
    criadas += 1;
  }

  console.log(`Candidaturas criadas: ${criadas}`);
  console.log(`Ignoradas (já existiam): ${ignoradas}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
