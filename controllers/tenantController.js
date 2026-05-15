exports.setEmpresaId = (req, res, next) => {
  if (!req.body.empresa_id && req.user.empresa_id) {
    req.body.empresa_id = req.user.empresa_id;
  }
  if (!req.body.sub_unidade_id && req.user.sub_unidade_id) {
    req.body.sub_unidade_id = req.user.sub_unidade_id;
  }
  next();
};

exports.filterByEmpresa = (req, res, next) => {
  if (req.user.empresa_id) {
    req.query.empresa_id = req.user.empresa_id;
  }
  if (req.user.sub_unidade_id) {
    req.query.sub_unidade_id = req.user.sub_unidade_id;
  }
  next();
};
