'use strict';

const jwksRsa = require('jwks-rsa');

const client = jwksRsa({
  jwksUri: 'https://example.invalid/.well-known/jwks.json'
});

if (!client || typeof client.getSigningKey !== 'function') {
  throw new Error('jwks-rsa CommonJS carregou, mas a API esperada não está disponível.');
}

console.log('JWKS-RSA COMMONJS OK');
