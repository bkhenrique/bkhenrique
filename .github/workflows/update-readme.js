const fetch = require('node-fetch');
const fs = require('fs');

const token = process.env.GITHUB_TOKEN;  // Usando token secreto

const headers = {
  'Authorization': `token ${token}`,
  'Accept': 'application/vnd.github.v3+json'
};

const repos = [
  'HOSTSERVERDOBRASIL/XDB-PAINELBACK-V2',
  'HOSTSERVERDOBRASIL/XDB-PAINELFRONT-V2'
];

async function getCommitCount(repo) {
  const response = await fetch(`https://api.github.com/repos/${repo}/commits?author=bkhenrique`, { headers });
  const commits = await response.json();
  return commits.length;
}

async function countAllCommits() {
  let totalCommits = 0;
  for (const repo of repos) {
    const count = await getCommitCount(repo);
    totalCommits += count;
  }
  return totalCommits;
}

countAllCommits().then(totalCommits => {
  const readmePath = './README.md';
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');
  const updatedReadme = readmeContent.replace(
    /Total de Commits nos repositórios privados: \*\*\d+\*\*/,
    `Total de Commits nos repositórios privados: **${totalCommits}**`
  );
  fs.writeFileSync(readmePath, updatedReadme);
});
