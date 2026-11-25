import test from 'node:test';
import assert from 'node:assert/strict';
import { urlHttpSegura } from '../src/utils/urlsSeguras.js';

test('rejeita protocolos executáveis, URLs inválidas e credenciais embutidas', () => {
  for (const valor of ['javascript:alert(1)', 'data:text/html,<script>teste</script>', 'file:///etc/passwd', 'blob:https://site.com/id', 'https://user:senha@site.com', 'https://[', undefined, {}]) {
    assert.equal(urlHttpSegura(valor, 'https://api.exemplo.com'), '');
  }
});

test('preserva links HTTP/HTTPS e resolve caminhos relativos', () => {
  assert.equal(urlHttpSegura('/api/usuarios/1/foto', 'https://api.exemplo.com'), 'https://api.exemplo.com/api/usuarios/1/foto');
  assert.equal(urlHttpSegura('https://site.com/a'), 'https://site.com/a');
  assert.equal(urlHttpSegura('http://localhost:8080/a'), 'http://localhost:8080/a');
});
