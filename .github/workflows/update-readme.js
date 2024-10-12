import fetch from 'node-fetch';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Para resolver o __dirname no ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.TO_TOKEN;

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
  const readmePath = path.join(__dirname, './README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');
  const updatedReadme = readmeContent.replace(
   const updatedReadme = readmeContent.replace(
  /<p align="center">Total de Commits nos repositórios privados: \*\*\d+\*\*<\/p>/,
  `<p align="center">Total de Commits nos repositórios privados: **${totalCommits}**</p>`
);

  );
  fs.writeFileSync(readmePath, updatedReadme);
});
