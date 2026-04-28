// TestivAI Visual Regression Example
// Docs: https://testiv.ai/docs#cypress
import '../support/testivai-witness';

describe('Visual Regression', () => {
  it('captures homepage', () => {
    cy.visit('/');
    cy.witness('homepage');
  });
});
