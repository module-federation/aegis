import { generateWorkflow, runWorkflow } from "../domain/orchestrate";

module.exports.startWorkflow = function ({ domainName, workflowName }) {
  const wfName = workflowName;
  const domain = domainName;

  /**@type {import("../domain").ports} */
  const ports = {
    requestCerts: {
      service: "CertificateAuthority",
      type: "outbound",
      keys: ["fullchain", "privkey"],
      consumesEvent: "requestCert",
      producesEvent: "certReceived",
    },
    installCerts: {
      service: "WriteFile",
      type: "inbound",
      keys: ["fullchain", "privkey"],
      consumesEvent: "certReceived",
      producesEvent: "workflowComplete",
    },
  };

  generateWorkflow({
    wfName,
    wfTasks: ports,
    wfInput: { domain },
  });

  runWorkflow({ wfName }).then((result) =>
    console.info(wfName, "workflow ran", result)
  );
};
