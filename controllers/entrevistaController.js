const Entrevista = require('./../models/entrevistaModel');
const Vaga = require('./../models/vagaModel');
const Candidato = require('./../models/candidatoModel');
const Candidatura = require('./../models/candidaturaModel');
const Funcionario = require('./../models/funcionarioModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const {
  registarTransicao,
  FASE_PARA_STATUS,
  STATUS_PARA_FASE,
} = require('./../utils/recruitmentPipeline');
const { getVagaIdsEmpresa } = require('./../utils/recruitmentTenant');

// Middleware: filtra por empresa (via vagas da empresa)
exports.filterByEmpresa = catchAsync(async (req, res, next) => {
  const vagas = await Vaga.find({ empresa_id: req.user.empresa_id}).select('_id');
  req.query.vaga_id = { $in: vagas.map(v => v._id) };
  next();
});

// Verificar se vaga e candidato pertencem à empresa
exports.verificarRelacoes = catchAsync(async (req, res, next) => {
  const { vaga_id, candidato_id, candidatura_id, entrevistador_id, fase } = req.body;

  if (vaga_id) {
    const vaga = await Vaga.findOne({ _id: vaga_id, empresa_id: req.user.empresa_id });
    if (!vaga) return next(new AppError('Vaga não encontrada', 404));
    if (vaga.status === 'Fechada' || vaga.status === 'Cancelada') {
      return next(new AppError('Não é possível agendar entrevistas para vagas fechadas/canceladas', 400));
    }
  }

  let candidatura = null;
  if (candidatura_id) {
    candidatura = await Candidatura.findById(candidatura_id);
    if (!candidatura) return next(new AppError('Candidatura não encontrada', 404));
    const vagaCand = await Vaga.findOne({ _id: candidatura.vaga_id, empresa_id: req.user.empresa_id });
    if (!vagaCand) return next(new AppError('Candidatura não pertence a esta empresa', 403));
    req.body.candidato_id = candidatura.candidato_id;
    req.body.vaga_id = candidatura.vaga_id;
    if (fase && FASE_PARA_STATUS[fase]) {
      req.body.fase = fase;
    }
  }

  if (candidato_id) {
    const candidato = await Candidato.findById(candidato_id);
    if (!candidato) return next(new AppError('Candidato não encontrado', 404));

    if (candidato.vaga_id) {
      const vagaCandidato = await Vaga.findOne({ _id: candidato.vaga_id, empresa_id: req.user.empresa_id });
      if (!vagaCandidato) return next(new AppError('Candidato não pertence a esta empresa', 403));
      if (vaga_id && candidato.vaga_id.toString() !== vaga_id.toString()) {
        return next(new AppError('Candidato não pertence à vaga selecionada', 400));
      }
    } else if (!candidatura) {
      candidatura = await Candidatura.findOne({ candidato_id, vaga_id });
      if (!candidatura) return next(new AppError('Candidatura não encontrada para este candidato', 404));
      req.body.candidatura_id = candidatura._id;
    }
  }

  if (entrevistador_id) {
    const entrevistador = await Funcionario.findOne({
      _id: entrevistador_id,
      empresa_id: req.user.empresa_id,
      status: 'Ativo'
    });
    if (!entrevistador) return next(new AppError('Entrevistador não encontrado ou inativo', 404));
  }

  next();
});

// Obter entrevistas por candidato
exports.getByCandidato = catchAsync(async (req, res, next) => {
  const candidato = await Candidato.findById(req.params.candidatoId);
  if (!candidato) return next(new AppError('Candidato não encontrado', 404));

  const vaga = await Vaga.findOne({ _id: candidato.vaga_id, empresa_id: req.user.empresa_id });
  if (!vaga) return next(new AppError('Candidato não pertence a esta empresa', 403));

  const entrevistas = await Entrevista.find({ candidato_id: req.params.candidatoId })
    .populate('entrevistador_id', 'nome email')
    .populate('vaga_id', 'cargo departamento_id')
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: entrevistas.length,
    data: { data: entrevistas }
  });
});

// Obter entrevistas por entrevistador
exports.getByEntrevistador = catchAsync(async (req, res, next) => {
  const entrevistador = await Funcionario.findOne({
    _id: req.params.entrevistadorId,
    empresa_id: req.user.empresa_id
  });
  if (!entrevistador) return next(new AppError('Entrevistador não encontrado', 404));

  const vagas = await Vaga.find({ empresa_id: req.user.empresa_id }).select('_id');
  const vagaIds = vagas.map(v => v._id);

  const entrevistas = await Entrevista.find({
    entrevistador_id: req.params.entrevistadorId,
    vaga_id: { $in: vagaIds }
  })
    .populate('candidato_id', 'nome email')
    .populate('vaga_id', 'cargo')
    .sort('-data');

  res.status(200).json({
    status: 'success',
    results: entrevistas.length,
    data: { data: entrevistas }
  });
});

// Obter entrevistas por data (agenda)
exports.getByData = catchAsync(async (req, res, next) => {
  const { dataInicio, dataFim } = req.query;

  if (!dataInicio || !dataFim) {
    return next(new AppError('Informe dataInicio e dataFim', 400));
  }

  const vagas = await Vaga.find({ empresa_id: req.user.empresa_id }).select('_id');
  const vagaIds = vagas.map(v => v._id);

  const entrevistas = await Entrevista.find({
    vaga_id: { $in: vagaIds },
    data: { $gte: new Date(dataInicio), $lte: new Date(dataFim) }
  })
    .populate('candidato_id', 'nome email telefone')
    .populate('entrevistador_id', 'nome email')
    .populate('vaga_id', 'cargo departamento_id')
    .sort('data hora');

  res.status(200).json({
    status: 'success',
    results: entrevistas.length,
    data: { data: entrevistas }
  });
});

// Alterar status da entrevista
exports.alterarStatus = catchAsync(async (req, res, next) => {
  const { status, feedback } = req.body;
  const statusValidos = ['Agendada', 'Realizada', 'Cancelada', 'Reagendada'];

  if (!statusValidos.includes(status)) {
    return next(new AppError(`Status inválido. Use: ${statusValidos.join(', ')}`, 400));
  }

  const vagas = await Vaga.find({ empresa_id: req.user.empresa_id }).select('_id');
  const vagaIds = vagas.map(v => v._id.toString());

  const entrevista = await Entrevista.findById(req.params.id);
  if (!entrevista) return next(new AppError('Entrevista não encontrada', 404));

  if (!vagaIds.includes(entrevista.vaga_id.toString())) {
    return next(new AppError('Entrevista não encontrada', 404));
  }

  entrevista.status = status;
  if (feedback) entrevista.feedback = feedback;

  // Atualizar status do candidato conforme status da entrevista
  if (status === 'Realizada') {
    await Candidato.findByIdAndUpdate(entrevista.candidato_id, { status: 'Entrevistado' });
  }

  await entrevista.save();

  res.status(200).json({
    status: 'success',
    data: { data: entrevista }
  });
});

// Estatísticas
exports.getEstatisticas = catchAsync(async (req, res, next) => {
  const vagas = await Vaga.find({ empresa_id: req.user.empresa_id }).select('_id');
  const vagaIds = vagas.map(v => v._id);

  const porStatus = await Entrevista.aggregate([
    { $match: { vaga_id: { $in: vagaIds } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const porTipo = await Entrevista.aggregate([
    { $match: { vaga_id: { $in: vagaIds } } },
    { $group: { _id: '$tipo', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const porMes = await Entrevista.aggregate([
    { $match: { vaga_id: { $in: vagaIds } } },
    {
      $group: {
        _id: { ano: { $year: '$data' }, mes: { $month: '$data' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.ano': -1, '_id.mes': -1 } }
  ]);

  const porEntrevistador = await Entrevista.aggregate([
    { $match: { vaga_id: { $in: vagaIds } } },
    { $group: { _id: '$entrevistador_id', count: { $sum: 1 } } },
    {
      $lookup: {
        from: 'funcionarios',
        localField: '_id',
        foreignField: '_id',
        as: 'entrevistador'
      }
    },
    { $unwind: '$entrevistador' },
    { $project: { nome: '$entrevistador.nome', count: 1 } },
    { $sort: { count: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: { porStatus, porTipo, porMes, porEntrevistador }
  });
});

exports.registarFeedback = catchAsync(async (req, res, next) => {
  const { scorecard, recomendacao, nota_geral, feedback } = req.body;
  const vagaIds = (await getVagaIdsEmpresa(req.user.empresa_id)).map(String);

  const entrevista = await Entrevista.findById(req.params.id);
  if (!entrevista || !vagaIds.includes(entrevista.vaga_id.toString())) {
    return next(new AppError('Entrevista não encontrada', 404));
  }

  if (scorecard) entrevista.scorecard = scorecard;
  if (recomendacao) entrevista.recomendacao = recomendacao;
  if (nota_geral) entrevista.nota_geral = nota_geral;
  if (feedback) entrevista.feedback = feedback;
  entrevista.status = 'Realizada';

  await entrevista.save();

  if (entrevista.candidatura_id) {
    const candidatura = await Candidatura.findById(entrevista.candidatura_id);
    if (candidatura) {
      if (recomendacao === 'nao') {
        await registarTransicao({
          candidatura,
          de: candidatura.status,
          para: 'rejeitado',
          usuarioId: req.user.id,
          empresaId: req.user.empresa_id,
          motivo: `Recomendação negativa na entrevista ${entrevista.fase}`,
          req,
        });
        candidatura.estagio_feedback = 'II';
        await candidatura.save();
      } else if (recomendacao === 'sim') {
        const esperado = STATUS_PARA_FASE[candidatura.status];
        if (esperado === entrevista.fase) {
          const candidato = await Candidato.findById(entrevista.candidato_id);
          if (candidato) {
            candidato.status = 'Entrevistado';
            await candidato.save({ validateBeforeSave: false });
          }
        }
      }
    }
  }

  res.status(200).json({ status: 'success', data: { data: entrevista } });
});

exports.reagendar = catchAsync(async (req, res, next) => {
  const { data, hora, link_reuniao, local } = req.body;
  const vagaIds = (await getVagaIdsEmpresa(req.user.empresa_id)).map(String);

  const entrevista = await Entrevista.findById(req.params.id);
  if (!entrevista || !vagaIds.includes(entrevista.vaga_id.toString())) {
    return next(new AppError('Entrevista não encontrada', 404));
  }

  if (data) entrevista.data = new Date(data);
  if (hora) entrevista.hora = hora;
  if (link_reuniao) entrevista.link_reuniao = link_reuniao;
  if (local) entrevista.local = local;
  entrevista.status = 'Reagendada';
  await entrevista.save();

  res.status(200).json({ status: 'success', data: { data: entrevista } });
});

exports.cancelar = catchAsync(async (req, res, next) => {
  const vagaIds = (await getVagaIdsEmpresa(req.user.empresa_id)).map(String);
  const entrevista = await Entrevista.findById(req.params.id);
  if (!entrevista || !vagaIds.includes(entrevista.vaga_id.toString())) {
    return next(new AppError('Entrevista não encontrada', 404));
  }

  entrevista.status = 'Cancelada';
  if (req.body.motivo) entrevista.feedback = req.body.motivo;
  await entrevista.save();

  res.status(200).json({ status: 'success', data: { data: entrevista } });
});

// CRUD padrão via factory
exports.getAllEntrevistas = catchAsync(async (req, res, next) => {
  const vagas = await Vaga.find({ empresa_id: req.user.empresa_id }).select('_id');
  const vagaIds = vagas.map((v) => v._id);

  const docs = await Entrevista.find({ vaga_id: { $in: vagaIds } })
    .populate({
      path: 'candidato_id',
      select: 'nome email telefone vaga_id',
      populate: { path: 'vaga_id', select: 'cargo departamento_id' }
    })
    .populate({ path: 'vaga_id', select: 'cargo departamento_id tipo_contrato' })
    .populate({ path: 'entrevistador_id', select: 'nome email' })
    .sort('-data -hora');

  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: { data: docs }
  });
});
exports.getEntrevista = catchAsync(async (req, res, next) => {
  const vagaIds = (await getVagaIdsEmpresa(req.user.empresa_id)).map(String);
  const doc = await Entrevista.findById(req.params.id)
    .populate('candidato_id', 'nome email telefone status')
    .populate('vaga_id', 'cargo departamento_id tipo_contrato')
    .populate('entrevistador_id', 'nome email')
    .populate('candidatura_id');

  if (!doc || !vagaIds.includes(doc.vaga_id.toString())) {
    return next(new AppError('Entrevista não encontrada', 404));
  }

  res.status(200).json({ status: 'success', data: { data: doc } });
});
exports.createEntrevista = factory.createOne(Entrevista);
exports.updateEntrevista = factory.updateOne(Entrevista);
exports.deleteEntrevista = factory.deleteOne(Entrevista);
