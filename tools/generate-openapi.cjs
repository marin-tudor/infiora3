/**
 * Generates openapi.json from swagger-jsdoc by scanning route TypeScript source files.
 * Run from repo root: node tools/generate-openapi.cjs
 * Requires: npm dependencies installed in infiora-backend-main/infiora-backend-main/
 */

'use strict';

const path = require('path');
const fs = require('fs');
const glob = require('glob');

const repoRoot = path.join(__dirname, '..');
const backendDir = path.join(repoRoot, 'infiora-backend-main', 'infiora-backend-main');
const outputDir = path.join(repoRoot, 'packages', 'infiora-api-contract', 'generated');
const outputFile = path.join(outputDir, 'openapi.json');

// Load swagger-jsdoc from backend node_modules
const swaggerJsdoc = require(path.join(backendDir, 'node_modules', 'swagger-jsdoc'));

const options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Infiora API',
      version: '1.0.0',
      description: 'Authoritative REST API for the Infiora hotel guest platform.',
    },
    servers: [
      {
        url: '{baseUrl}/v1',
        variables: {
          baseUrl: {
            default: 'http://localhost:3000',
            description: 'Backend base URL',
          },
        },
      },
    ],
  },
  apis: [
    path.join(backendDir, 'packages', 'components.yaml'),
    path.join(backendDir, 'src', 'routes', 'v1', '*.ts'),
  ],
};

try {
  const spec = swaggerJsdoc(options);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(spec, null, 2));

  const pathCount = Object.keys(spec.paths || {}).length;
  console.log(`OpenAPI spec generated: ${outputFile}`);
  console.log(`  Paths documented: ${pathCount}`);
  console.log(`  OpenAPI version: ${spec.openapi}`);
} catch (err) {
  console.error('Failed to generate OpenAPI spec:', err.message);
  process.exit(1);
}
