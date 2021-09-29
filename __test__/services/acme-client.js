const acme = require('acme-client')
const client = new acme.Client()

const cert = acme.forge.createCsr({
   commonName: 'test.example.com'
}).then(([certificateKey, certificateRequest]) => client.auto({
    csr: certificateRequest,
    email: 'test@example.com',
    termsOfServiceAgreed: true,
    challengeCreateFn: async (authz, challenge, keyAuthorization) => {
        // Satisfy challenge here
    },
    challengeRemoveFn: async (authz, challenge, keyAuthorization) => {
        // Clean up challenge here
    }
}));
