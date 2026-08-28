const Vaga = require('../models/vagaModel');
const AppError = require('./appError');

async function assertVagaEmpresa(vagaId, empresaId) {
  const vaga = await Vaga.findOne({ _id: vagaId, empresa_id: empresaId });
  if (!vaga) throw new AppError('Vaga não encontrada', 404);
  return vaga;
}

async function getVagaIdsEmpresa(empresaId) {
  return Vaga.find({ empresa_id: empresaId }).distinct('_id');
}

async function assertCandidaturaEmpresa(candidatura, empresaId) {
  const vaga = await Vaga.findOne({
    _id: candidatura.vaga_id,
    empresa_id: empresaId,
  });
  if (!vaga) throw new AppError('Candidatura não encontrada', 404);
  return vaga;
}

module.exports = {
  assertVagaEmpresa,
  getVagaIdsEmpresa,
  assertCandidaturaEmpresa,
};
