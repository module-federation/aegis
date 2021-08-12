const { Octokit } = require("@octokit/rest");
const token = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: token });

function octoGet(entry) {
  console.info("github url", entry.url);
  const owner = entry.owner;
  const repo = entry.repo;
  const filedir = entry.filedir;
  const branch = entry.branch;
  return new Promise(function (resolve, _reject) {
    octokit
      .request("GET /repos/{owner}/{repo}/contents/{filedir}?ref={branch}", {
        owner,
        repo,
        filedir,
        branch,
      })
      .then(function (rest) {
        const file = rest.data.find(d => /\.wasm$/.test(d.name));
        return file.sha;
      })
      .then(function (sha) {
        console.log(sha);
        return octokit.request("GET /repos/{owner}/{repo}/git/blobs/{sha}", {
          owner,
          repo,
          sha,
        });
      })
      .then(function (rest) {
        resolve(Buffer.from(rest.data.content, "base64").toString("utf-8"));
      });
  });
}

function httpGet(params) {
  return new Promise(function (resolve, reject) {
    var req = require(params.protocol.slice(
      0,
      params.protocol.length - 1
    )).request(params, function (res) {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error("statusCode=" + res.statusCode));
      }
      var body = [];
      res.on("data", function (chunk) {
        body.push(chunk);
      });
      res.on("end", function () {
        try {
          body = Buffer.concat(body).toString();
        } catch (e) {
          reject(e);
        }
        resolve(body);
      });
    });
    req.on("error", function (err) {
      reject(err);
    });
    req.end();
  });
}

export function fetchWasm(entry) {
  if (/github/i.test(entry.url)) return octoGet(entry);
  return httpGet(entry.url);
}
