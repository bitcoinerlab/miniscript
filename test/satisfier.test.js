import { satisfier, ready } from '../dist/index.js';
import { runSatisfierFixtures } from './satisfier-shared.js';

describe('Satisfier (C++)', () => {
  beforeAll(async () => {
    await ready;
  });

  runSatisfierFixtures(satisfier);
});
