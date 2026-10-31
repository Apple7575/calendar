const assert = require('node:assert/strict');
const { rpc } = require('./dot-learning-mcp.cjs');
const { validateLearningSummary } = require('../src/lib/learningSummary.ts');
(async () => {
  const { tools } = await rpc({ method: 'tools/list' });
  const tool = tools.find(item => item.name === 'save_learning_summary');
  assert.ok(tool);
  assert.ok(new RegExp(tool.inputSchema.properties.date.pattern).test('2026-10-30'));
  assert.equal(new RegExp(tool.inputSchema.properties.date.pattern).test('not-a-date'), false);
  const sample = { schema: 'routine.learning-summary.v1', eventId: 'schema-check', revision: 1, date: '2026-10-30', title: '검사', summary: '검사', topics: [], questions: [], nextAction: '', sourceUrl: '' };
  assert.equal(validateLearningSummary(sample).date, sample.date);
  assert.throws(() => validateLearningSummary({ ...sample, date: '2026-02-30' }));
  const result = await rpc({ method: 'tools/call', params: { name: tool.name, arguments: { ...sample, date: '2026-02-30' } } });
  assert.equal(result.isError, true);
  console.log(JSON.stringify({ toolDiscovered: true, dateSchemaValid: true, impossibleDateRejected: true, networkWrites: false }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
