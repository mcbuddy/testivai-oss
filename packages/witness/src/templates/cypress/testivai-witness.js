// TestivAI Visual Regression Helper
// Docs: https://testiv.ai/docs#cypress
Cypress.Commands.add('witness', (name) => {
  return cy.window().invoke('testivaiWitness', name);
});
