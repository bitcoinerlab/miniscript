import { satisfierJs, ready } from '../dist/index.js';
import { runSatisfierFixtures } from './satisfier-shared.js';

describe('Satisfier (JS)', () => {
  beforeAll(async () => {
    await ready;
  });

  runSatisfierFixtures(satisfierJs);
});
