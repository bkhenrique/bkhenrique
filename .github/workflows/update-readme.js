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

async function getBranches(repo) {
  const response = await fetch(`https://api.github.com/repos/${repo}/branches`, { headers });
  const branches = await response.json();
  return branches.map(branch => branch.name);
}

async function getCommitCount(repo, branch) {
  const response = await fetch(`https://api.github.com/repos/${repo}/commits?sha=${branch}&author=bkhenrique&per_page=100`, { headers });
  const commits = await response.json();
  return commits.length;
}

async function countCommitsForRepo(repo) {
  let totalRepoCommits = 0;
  const branches = await getBranches(repo);

  for (const branch of branches) {
    const branchCommitCount = await getCommitCount(repo, branch);
    totalRepoCommits += branchCommitCount;
  }

  return totalRepoCommits;
}

async function countCommitsForAllRepos() {
  let totalCommits = 0;

  for (const repo of repos) {
    const repoCommitCount = await countCommitsForRepo(repo);
    totalCommits += repoCommitCount;
  }

  return totalCommits;
}

countCommitsForAllRepos().then(totalCommits => {
  console.log(`Total de commits calculados: ${totalCommits}`);
  
  const readmePath = path.join(__dirname, '../../README.md'); // Ajuste o caminho aqui
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');
  const updatedReadme = readmeContent.replace(
  /<p align="center">Total de Commits nos repositórios privados: \*\*\d+\*\*<\/p>/,
  `<p align="center">Total de Commits nos repositórios privados: **${totalCommits}**</p>`
);

console.log('Conteúdo atualizado:', updatedReadme);  // Verifique o conteúdo atualizado
fs.writeFileSync(readmePath, updatedReadme);

