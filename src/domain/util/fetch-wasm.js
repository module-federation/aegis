const { Octokit } = require("@octokit/rest");
const token = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: token });

function octoGet(url) {
  console.info("github url", url);
  const owner = url.searchParams.get("owner");
  const repo = url.searchParams.get("repo");
  const filedir = url.searchParams.get("filedir");
  const branch = url.searchParams.get("branch");
  return new Promise(function (resolve, reject) {
    octokit
      .request("GET /repos/{owner}/{repo}/contents/{filedir}?ref={branch}", {
        owner,
        repo,
        filedir,
        branch,
      })
      .then(function (rest) {
        const file = rest.data.find(d => d.endsWidth(".wasm"));
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

export function fetchWasm(url) {
  if (/github/i.test(url.hostname)) return octoGet(url);
  return httpGet(url);
}
