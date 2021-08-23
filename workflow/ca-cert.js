

/** 
 * Workflow model
 * @type {import("../src/domain").ModelSpecification}
 */
const CACert = {
  modelName: "cacert",
  endpoint: "workflow",
  ports: {
    requestCert: {
      service: "CertificateAuthority",
      type: "outbound",
      keys: ["fullchain", "privkey"],
      consumesEvent: "requestCert",
      producesEvent: "certReceived",
    },
    installCert: {
      service: "WriteFiles",
      type: "inbound",
      keys: ["fullchain", "privkey", "path=./cert"],
      consumesEvent: "certReceived",
      producesEvent: "certFilesWritten",
    },
    restartWebserver: {
      service: "RestartWebserver",
      type: "inbound",
      consumesEvent: "certFilesWritten",
      producesEvent: "workflowComplete",
    }
  },
}

module.exports.CACert = CACert;
