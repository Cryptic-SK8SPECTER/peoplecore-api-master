const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

// ─── Importar Routers ─────────────────────────────────────────
const usuarioRouter = require('./routes/usuarioRoutes');
const empresaRouter = require('./routes/empresaRoutes');
const funcionarioRouter = require('./routes/funcionarioRoutes');
const departamentoRouter = require('./routes/departamentoRoutes');
const cargoRouter = require('./routes/cargoRoutes');
const presencaRouter = require('./routes/presencaRoutes');
const faltaRouter = require('./routes/faltaRoutes');
const horaExtraRouter = require('./routes/horaExtraRoutes');
const feriasRouter = require('./routes/feriasRoutes');
const saldoFeriasRouter = require('./routes/saldoFeriasRoutes');
const tipoLicencaRouter = require('./routes/tipoLicencaRoutes');
const avaliacaoRouter = require('./routes/avaliacaoRoutes');
const avaliacaoFuncionarioRouter = require('./routes/avaliacaoFuncionarioRoutes');
const metaRouter = require('./routes/metaRoutes');
const pontuacaoCriterioRouter = require('./routes/pontuacaoCriterioRoutes');
const folhaPagamentoRouter = require('./routes/folhaPagamentoRoutes');
const itemFolhaRouter = require('./routes/itemFolhaRoutes');
const bonusRouter = require('./routes/bonusRoutes');
const descontoRouter = require('./routes/descontoRoutes');
const reciboRouter = require('./routes/reciboRoutes');
const candidatoRouter = require('./routes/candidatoRoutes');
const entrevistaRouter = require('./routes/entrevistaRoutes');
const vagaRouter = require('./routes/vagaRoutes');
const contratacaoRouter = require('./routes/contratacaoRoutes');
const documentoRouter = require('./routes/documentoRoutes');
const beneficioRouter = require('./routes/beneficioRoutes');
const beneficioFuncionarioRouter = require('./routes/beneficioFuncionarioRoutes');
const perfilRouter = require('./routes/perfilRoutes');
const permissaoRouter = require('./routes/permissaoRoutes');
const logSistemaRouter = require('./routes/logSistemaRoutes');
const apiKeyRouter = require('./routes/apiKeyRoutes');
const termosCondicoesRouter = require('./routes/termosCondicoesRoutes');
const termosAceitacaoRouter = require('./routes/termosAceitacaoRoutes');
const notificacaoRouter = require('./routes/notificacaoRoutes');

// Start express app
const app = express();

app.enable('trust proxy');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// Implement CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:8080',
          'http://localhost:8081',
          'cryptic-sk8specter.tailc8215c.ts.net',
        ];
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  app.set('trust proxy', 1);
} else {
  app.use(
    morgan('combined', {
      skip: (req, res) => res.statusCode < 400,
    }),
  );
  app.set('trust proxy', false);
}

// Rate limiting geral para API
const limiter = rateLimit({
  max:
    process.env.NODE_ENV === 'development'
      ? 999999
      : process.env.RATE_LIMIT_MAX || 100,
  windowMs: 60 * 60 * 1000, // 1 hora
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again in an hour!',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development', // Pular rate limit em desenvolvimento
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests from this IP, please try again in an hour!',
    });
  },
});

// Rate limiting para autenticação
const authLimiter = rateLimit({
  max:
    process.env.NODE_ENV === 'development'
      ? 999999
      : process.env.AUTH_RATE_LIMIT_MAX || 5,
  windowMs: 15 * 60 * 1000,
  message: {
    status: 'error',
    message:
      'Too many login attempts from this IP, please try again after 15 minutes!',
  },
  skipSuccessfulRequests: true,
  skip: (req) => process.env.NODE_ENV === 'development', // Pular rate limit em desenvolvimento
  standardHeaders: true,
  legacyHeaders: false,
});

// Slow down
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500;
  },
  skip: (req) => process.env.NODE_ENV === 'development', // Pular em desenvolvimento
  validate: { trustProxy: false },
});

app.use('/api', limiter);
app.use('/api/v1/usuarios/login', authLimiter);
app.use('/api/v1/usuarios/signup', authLimiter);
app.use('/api/v1/usuarios/forgotPassword', authLimiter);
app.use('/api', speedLimiter);

// Body parser
app.use(
  express.json({
    limit: '10kb',
    strict: true,
  }),
);
app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb',
    parameterLimit: 50,
  }),
);
app.use(
  cookieParser(
    process.env.COOKIE_SECRET || 'your-secret-cookie-key-change-in-production',
  ),
);

// Data sanitization against NoSQL query injection
app.use(
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(
        `NoSQL injection attempt detected: ${key} from IP ${req.ip}`,
      );
    },
  }),
);

// Data sanitization against XSS
app.use(xss());

app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES
// ─── Autenticação e Utilizadores ──────────────────────────────
app.use('/api/v1/usuarios', usuarioRouter);

// ─── Empresa ──────────────────────────────────────────────────
app.use('/api/v1/empresas', empresaRouter);

// ─── Funcionários ─────────────────────────────────────────────
app.use('/api/v1/funcionarios', funcionarioRouter);
app.use('/api/v1/departamentos', departamentoRouter);
app.use('/api/v1/cargos', cargoRouter);
app.use('/api/v1/documentos', documentoRouter);

// ─── Presenças e Assiduidade ──────────────────────────────────
app.use('/api/v1/presencas', presencaRouter);
app.use('/api/v1/faltas', faltaRouter);
app.use('/api/v1/horas-extras', horaExtraRouter);

// ─── Férias e Licenças ────────────────────────────────────────
app.use('/api/v1/ferias', feriasRouter);
app.use('/api/v1/saldo-ferias', saldoFeriasRouter);
app.use('/api/v1/tipos-licenca', tipoLicencaRouter);

// ─── Avaliações de Desempenho ─────────────────────────────────
app.use('/api/v1/avaliacoes', avaliacaoRouter);
app.use('/api/v1/avaliacoes-funcionario', avaliacaoFuncionarioRouter);
app.use(
  '/api/v1/avaliacoes/:avaliacaoId/funcionarios',
  avaliacaoFuncionarioRouter,
);
app.use('/api/v1/metas', metaRouter);
app.use('/api/v1/pontuacoes-criterio', pontuacaoCriterioRouter);

// ─── Payroll (Folha de Pagamento) ─────────────────────────────
app.use('/api/v1/folhas-pagamento', folhaPagamentoRouter);
app.use('/api/v1/itens-folha', itemFolhaRouter);
app.use('/api/v1/bonus', bonusRouter);
app.use('/api/v1/descontos', descontoRouter);
app.use('/api/v1/recibos', reciboRouter);

// ─── Recrutamento ─────────────────────────────────────────────
app.use('/api/v1/vagas', vagaRouter);
app.use('/api/v1/candidatos', candidatoRouter);
app.use('/api/v1/entrevistas', entrevistaRouter);
app.use('/api/v1/contratacoes', contratacaoRouter);

// ─── Benefícios ───────────────────────────────────────────────
app.use('/api/v1/beneficios', beneficioRouter);
app.use('/api/v1/beneficios-funcionario', beneficioFuncionarioRouter);

// ─── Perfis e Permissões ──────────────────────────────────────
app.use('/api/v1/perfis', perfilRouter);
app.use('/api/v1/permissoes', permissaoRouter);

// ─── Administração ────────────────────────────────────────────
app.use('/api/v1/logs', logSistemaRouter);
app.use('/api/v1/api-keys', apiKeyRouter);
app.use('/api/v1/termos-condicoes', termosCondicoesRouter);
app.use('/api/v1/termos-aceitacao', termosAceitacaoRouter);

// ─── Notificações ─────────────────────────────────────────────
app.use('/api/v1/notificacoes', notificacaoRouter);

// ─── 404 ──────────────────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
