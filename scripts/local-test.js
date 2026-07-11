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

const TEST_ISSUE_ID = 'local-test-issue-0001';
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const plus = (days) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return iso(d);
};

const baseIssue = {
  id: TEST_ISSUE_ID,
  identifier: 'TEST-1',
  title: '[로컬 테스트] Google Calendar 연동 검증',
  url: 'https://linear.app/example/issue/TEST-1',
  state: { name: 'In Progress' },
  assignee: { name: '지호' },
  priorityLabel: 'Medium',
  dueDate: plus(3),
};

async function run() {
  console.log('\n[1] create — dueDate 있음 → 이벤트 생성 기대');
  console.log(await handleWebhook({ type: 'Issue', action: 'create', data: baseIssue }));

  console.log('\n[2] update — title & dueDate 변경 → 이벤트 갱신 기대');
  console.log(await handleWebhook({
    type: 'Issue',
    action: 'update',
    data: { ...baseIssue, title: '[로컬 테스트] 수정된 제목', dueDate: plus(5) },
  }));

  console.log('\n[3] update — dueDate 제거 → 이벤트 삭제 기대');
  console.log(await handleWebhook({
    type: 'Issue',
    action: 'update',
    data: { ...baseIssue, dueDate: null },
  }));

  console.log('\n[4] create 재실행 → 이벤트 재생성 기대');
  console.log(await handleWebhook({ type: 'Issue', action: 'create', data: baseIssue }));

  console.log('\n[5] remove → 이벤트 삭제 기대');
  console.log(await handleWebhook({ type: 'Issue', action: 'remove', data: baseIssue }));

  console.log('\n완료. Google Calendar에서 이벤트가 생성/삭제되는 모습을 실시간으로 확인해보세요.');
}

run().catch((err) => {
  console.error('테스트 실패:', err);
  process.exit(1);
});
