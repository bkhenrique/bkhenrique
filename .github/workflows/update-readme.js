import fetch from 'node-fetch';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== ENV / Config ======
const TOKEN = process.env.TO_TOKEN; // seu PAT com escopos repo + read:org
const USERNAME = process.env.GITHUB_USERNAME || 'bkhenrique';

// Liste aqui seus repositórios privados/org que quer computar
const REPOS =
  (process.env.REPOS && process.env.REPOS.split(',').map(s => s.trim())) ||
  [
    'HOSTSERVERDOBRASIL/XDB-PAINELBACK-V2',
    'HOSTSERVERDOBRASIL/XDB-PAINELFRONT-V2',
  ];

// Filtrar branches para reduzir custo e duplicidade
const BRANCH_FILTER = process.env.BRANCH_FILTER || 'main|master|develop|homolog|release/.+';

// Opcional: contar só a partir de uma data (ISO). Ex.: '2025-01-01T00:00:00Z'
const SINCE = process.env.SINCE || null;

const H = {
  'Authorization': `token ${TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': `${USERNAME}-commit-counter`,
};

function needToken() {
  if (!TOKEN) {
    console.error('Faltou TO_TOKEN no ambiente (PAT com repo + read:org).');
    process.exit(1);
  }
}

async function fetchAll(urlBase, params = {}) {
  const perPage = 100;
  let page = 1;
  const all = [];

  while (true) {
    const url = new URL(urlBase);
    Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
    url.searchParams.set('per_page', perPage);
    url.searchParams.set('page', page);

    const res = await fetch(url, { headers: H });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Erro ${res.status} em ${url}: ${text}`);
    }

    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;

    all.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }

  return all;
}

async function getBranches(repo) {
  const url = `https://api.github.com/repos/${repo}/branches`;
  const branches = await fetchAll(url);
  const names = branches.map(b => b.name);
  if (!BRANCH_FILTER) return names;
  const re = new RegExp(`^(?:${BRANCH_FILTER})$`);
  return names.filter(n => re.test(n));
}

async function getCommitsForBranch(repo, branch) {
  const url = `https://api.github.com/repos/${repo}/commits`;
  const params = {
    sha: branch,
    author: USERNAME,
  };
  if (SINCE) params.since = SINCE;

  const commits = await fetchAll(url, params);
  return commits.filter(c => c && c.sha).map(c => c.sha);
}

async function countUniqueCommitsForRepo(repo) {
  const branches = await getBranches(repo);
  if (branches.length === 0) return 0;

  const shaSet = new Set();
  for (const branch of branches) {
    try {
      const shas = await getCommitsForBranch(repo, branch);
      shas.forEach(sha => shaSet.add(sha));
    } catch (e) {
      console.warn(`Aviso: ${repo}@${branch}: ${e.message}`);
    }
  }
  return shaSet.size;
}

function updateBadgeNumber(md, total) {
  // Substitui o número do badge "Total_Commits-<N>+"
  // Procura algo como: Total_Commits-661+-00D9FF
  const badgeRegex = /(Total_Commits-)(\d+)\+(-[0-9A-Fa-f]{6}\?style=for-the-badge)/;
  if (badgeRegex.test(md)) {
    return md.replace(badgeRegex, (_, a, _old, c) => `${a}${total}+${c}`);
  }

  // Versão alternativa de badge (sem cor fixa após o número)
  const simpleBadgeRegex = /(Total_Commits-)(\d+)\+(\?style=for-the-badge)/;
  if (simpleBadgeRegex.test(md)) {
    return md.replace(simpleBadgeRegex, (_, a, _old, c) => `${a}${total}+${c}`);
  }

  // Se não achar, não altera
  return md;
}

function updateRealBlock(md, total) {
  const start = '<!--REAL_STATS:START-->';
  const end = '<!--REAL_STATS:END-->';
  const re = new RegExp(`${start}[\\s\\S]*?${end}`);
  const line = `<p align="center">Total de commits <b>(privados + organizações, deduplicado entre branches)</b>: <strong>${total}</strong></p>`;
  const block = `${start}\n${line}\n${end}`;
  return re.test(md) ? md.replace(re, block) : `${md.trim()}\n\n${block}\n`;
}

async function main() {
  needToken();

  let total = 0;
  for (const repo of REPOS) {
    try {
      const n = await countUniqueCommitsForRepo(repo);
      console.log(`Repo ${repo}: ${n} commits únicos`);
      total += n;
    } catch (e) {
      console.error(`Erro em ${repo}: ${e.message}`);
    }
  }

  console.log(`TOTAL (privados+orgs, dedup por SHA): ${total}`);

  const readmePath = path.join(__dirname, '../../README.md');
  const md = fs.readFileSync(readmePath, 'utf8');

  // 1) atualiza badge
  let updated = updateBadgeNumber(md, total);

  // 2) atualiza bloco real
  updated = updateRealBlock(updated, total);

  if (updated !== md) {
    fs.writeFileSync(readmePath, updated, 'utf8');
    console.log('README atualizado com sucesso.');
  } else {
    console.log('Nenhuma mudança no README.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
