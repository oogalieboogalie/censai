import express from 'express';
import { listRepos } from './repos.js';
import { getTree, browseDir } from './browser.js';
import { readFile, writeFile } from './content.js';
import { searchTree } from './search.js';
import { createIssue } from './issues.js';

export const githubRouter = express.Router();

githubRouter.get('/repos', listRepos);
githubRouter.get('/tree', getTree);
githubRouter.post('/write', writeFile);
githubRouter.get('/file', readFile);
githubRouter.post('/issues', createIssue);
githubRouter.get('/browse', browseDir);
githubRouter.get('/search', searchTree);
