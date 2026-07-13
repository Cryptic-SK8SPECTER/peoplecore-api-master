/**
 * Atribui perfil Administrador a utilizadores admin sem perfil numa empresa.
 * Uso:
 *   node scripts/atribuir-admin-empresa.js --email francisco.tembe@peoplecore.io
 *   node scripts/atribuir-admin-empresa.js --empresa 69ae6e9398fa38e8073bf376
 */
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Usuario = require('../models/usuarioModel');
const {
  criarPerfisPadraoEmpresa,
  sincronizarPerfilUsuario,
} = require('../utils/perfilPermissoes');

dotenv.config({ path: path.join(__dirname, '../config.env') });

const DB = process.env.DATABASE?.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

const args = process.argv.slice(2);
const emailArg = args[args.indexOf('--email') + 1];
const empresaArg = args[args.indexOf('--empresa') + 1];

async function main() {
  if (!DB) {
    console.error('DATABASE não configurada em config.env');
    process.exit(1);
  }

  await mongoose.connect(DB);
  console.log('Ligado à base de dados.');

  let utilizadores = [];

  if (emailArg) {
    const user = await Usuario.findOne({ email: emailArg.toLowerCase() });
    if (!user) {
      console.error(`Utilizador não encontrado: ${emailArg}`);
      process.exit(1);
    }
    utilizadores = [user];
  } else if (empresaArg) {
    await criarPerfisPadraoEmpresa(empresaArg);
    utilizadores = await Usuario.find({
      empresa_id: empresaArg,
      perfil_id: null,
      role: { $ne: 'super-admin' },
    });
  } else {
    console.error('Use --email <email> ou --empresa <empresa_id>');
    process.exit(1);
  }

  for (const user of utilizadores) {
    await sincronizarPerfilUsuario(user);
    const atualizado = await Usuario.findById(user._id).populate('perfil_id', 'nome codigo');
    console.log(
      `✓ ${atualizado.email} → role=${atualizado.role}, perfil=${atualizado.perfil_id?.nome || '—'}`,
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
