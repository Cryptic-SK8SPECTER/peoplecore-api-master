const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Empresa = require('./../../models/empresaModel');
const Departamento = require('./../../models/departamentoModel');
const Perfil = require('./../../models/perfilModel');
const Cargo = require('./../../models/cargoModel');
const Funcionario = require('./../../models/funcionarioModel');
const Usuario = require('./../../models/usuarioModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    // Mongoose 8+ já usa as novas opções por padrão
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  })
  .then(() => console.log('DB connection successful!'))
  .catch(err => {
    console.error('DB connection error:', err);
    process.exit(1);
  });

// READ JSON FILE
const empresas = JSON.parse(
  fs.readFileSync(`${__dirname}/empresas.json`, 'utf-8'),
);
const departamentos  = JSON.parse(fs.readFileSync(`${__dirname}/departamentos.json`, 'utf-8'));
const perfis = JSON.parse(fs.readFileSync(`${__dirname}/perfis.json`, 'utf-8'));
const cargos = JSON.parse(fs.readFileSync(`${__dirname}/cargos.json`, 'utf-8'));
const funcionarios = JSON.parse(
  fs.readFileSync(`${__dirname}/funcionarios.json`, 'utf-8'),
);
const usuarios = JSON.parse(fs.readFileSync(`${__dirname}/usuarios.json`, 'utf-8'));


// IMPORT DATA INTO DB
const importData = async () => {
  try {
    // await Empresa.create(empresas);
    // await Departamento.create(departamentos);
    // await Perfil.create(perfis);
    // await Cargo.create(cargos);
    // await Funcionario.create(funcionarios);
    await Usuario.create(usuarios, { validateBeforeSave: false });
    console.log('Data successfully loaded!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await Empresa.deleteMany();
    await Departamento.deleteMany();
    await Perfil.deleteMany();
    await Cargo.deleteMany();
    await Funcionario.deleteMany();
    await Usuario.deleteMany();
    console.log('Data successfully deleted!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
