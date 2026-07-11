import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleWebhook } from '../lib/handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

const today = new Date();
const plus = (days) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const issue = {
  id: `local-test-${Date.now()}`,
  identifier: 'TEST-1',
  title: '[로컬 테스트] Google Calendar 연동 확인',
  url: 'https://linear.app/example/issue/TEST-1',
  state: { name: 'In Progress' },
  assignee: { name: '지호' },
  priorityLabel: 'Medium',
  dueDate: plus(3),
};

const result = await handleWebhook({ type: 'Issue', action: 'create', data: issue });
console.log('결과:', result);
console.log(`캘린더에서 ${issue.dueDate} 날짜에 "[TEST-1] ${issue.title}" 이벤트를 찾으세요.`);
