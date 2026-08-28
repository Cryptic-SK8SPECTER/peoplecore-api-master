/**
 * Garante um super-admin na base de dados (upsert).
 * Uso: node scripts/seed-super-admin.js
 */
const dns = require('dns');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Usuario = require('../models/usuarioModel');

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.join(__dirname, '../config.env') });

const DB = process.env.DATABASE?.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

const TEST_USER = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@peoplecore.test',
  nome: 'Super Admin Teste',
  role: 'super-admin',
  password: process.env.TEST_ADMIN_PASSWORD || 'Admin123!',
  passwordConfirm: process.env.TEST_ADMIN_PASSWORD || 'Admin123!',
  status: 'Ativo',
  active: true,
};

async function main() {
  if (!DB) {
    console.error('DATABASE não configurada em config.env');
    process.exit(1);
  }

  await mongoose.connect(DB);
  console.log('Ligado à base de dados.');

  const existing = await Usuario.findOne({ email: TEST_USER.email }).select('+password');

  if (existing) {
    existing.nome = TEST_USER.nome;
    existing.role = 'super-admin';
    existing.status = 'Ativo';
    existing.active = true;
    existing.password = TEST_USER.password;
    existing.passwordConfirm = TEST_USER.passwordConfirm;
    await existing.save({ validateBeforeSave: false });
    console.log(`✓ Utilizador actualizado: ${TEST_USER.email}`);
  } else {
    await Usuario.create(TEST_USER);
    console.log(`✓ Utilizador criado: ${TEST_USER.email}`);
  }

  console.log('\nCredenciais de teste:');
  console.log(`  Email:    ${TEST_USER.email}`);
  console.log(`  Password: ${TEST_USER.password}`);
  console.log(`  Role:     super-admin`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
