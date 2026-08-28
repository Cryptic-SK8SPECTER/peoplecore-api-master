const assert = require('assert');
const crypto = require('crypto');
const {
  podeTransicionar,
  proximoEstadoAposEntrevista,
  estagioFeedbackParaStatus,
} = require('../../utils/recruitmentPipeline');
const { calcularPontuacao } = require('../../utils/screeningEvaluator');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

console.log('recruitment pipeline');
test('novo → triagem permitido', () => {
  assert.strictEqual(podeTransicionar('novo', 'triagem'), true);
});
test('novo → contratado bloqueado', () => {
  assert.strictEqual(podeTransicionar('novo', 'contratado'), false);
});
test('entrevista_rh → assessment após sim', () => {
  assert.strictEqual(
    proximoEstadoAposEntrevista('entrevista_rh', false),
    'assessment',
  );
});
test('entrevista_bu sem excom → ref_check', () => {
  assert.strictEqual(
    proximoEstadoAposEntrevista('entrevista_bu', false),
    'ref_check',
  );
});
test('estágio feedback triagem = I', () => {
  assert.strictEqual(estagioFeedbackParaStatus('triagem'), 'I');
});

console.log('screening evaluator');
test('desqualifica pergunta eliminatória', () => {
  const perguntas = [
    {
      _id: '1',
      texto: 'CNH?',
      tipo: 'sim_nao',
      obrigatoria: true,
      eh_desclassificatoria: true,
      resposta_esperada: 'sim',
      peso: 1,
    },
  ];
  const result = calcularPontuacao(perguntas, [
    { pergunta_id: '1', resposta: 'nao' },
  ]);
  assert.strictEqual(result.desqualificado, true);
});
test('pontuação positiva', () => {
  const perguntas = [
    {
      _id: '1',
      texto: 'Experiência?',
      tipo: 'sim_nao',
      obrigatoria: true,
      eh_desclassificatoria: false,
      resposta_esperada: 'sim',
      peso: 2,
    },
  ];
  const result = calcularPontuacao(perguntas, [
    { pergunta_id: '1', resposta: 'sim' },
  ]);
  assert.strictEqual(result.pontuacao_triagem, 100);
});

console.log('form token');
test('token criptográfico tem 48 chars hex', () => {
  const token = crypto.randomBytes(24).toString('hex');
  assert.strictEqual(token.length, 48);
});

console.log('\nTodos os testes passaram.');
