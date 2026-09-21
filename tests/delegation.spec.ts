import {test,expect,type Page} from '@playwright/test';

// 清除委托相关的本地持久化，保证每个用例从种子数据开始
async function resetDelegation(page:Page){
 await page.goto('/');
 await page.evaluate(()=>localStorage.removeItem('flowdesk-delegation-v1'));
 await page.reload();
}

test.describe.serial('审批委托台',()=>{
 test('登记委托成功并在刷新后保持一致',async({page})=>{
  await resetDelegation(page);
  await page.goto('/delegations');
  await page.getByLabel('委托人').selectOption({label:'陆远'});
  await page.getByLabel('受托人').selectOption({label:'苏菲'});
  await page.getByLabel('委托业务域').selectOption({label:'法务'});
  await page.getByLabel('委托开始时间').fill('2026-10-01T09:00');
  await page.getByLabel('委托结束时间').fill('2026-10-20T18:00');
  await page.getByLabel('委托事由').fill('法务培训');
  await page.getByTestId('submit-delegation').click();
  await expect(page.getByRole('status')).toContainText('委托已登记');
  await expect(page.getByTestId('conflict-panel')).toHaveCount(0);
  const row=page.getByTestId('delegation-row').filter({hasText:'陆远'}).filter({hasText:'苏菲'}).filter({hasText:'法务'});
  await expect(row).toBeVisible();
  // 刷新后委托关系仍在
  await page.reload();
  await expect(page.getByTestId('delegation-row').filter({hasText:'陆远'}).filter({hasText:'法务'})).toBeVisible();
 });

 test('时段重叠时列出委托人受托人与命中规则',async({page})=>{
  await resetDelegation(page);
  await page.goto('/delegations');
  // 种子数据：陈默在财务域 2026-09-01~09-30 已有生效委托
  await page.getByLabel('委托人').selectOption({label:'陈默'});
  await page.getByLabel('受托人').selectOption({label:'王宁'});
  await page.getByLabel('委托业务域').selectOption({label:'财务'});
  await page.getByLabel('委托开始时间').fill('2026-09-20T09:00');
  await page.getByLabel('委托结束时间').fill('2026-10-05T18:00');
  await page.getByTestId('submit-delegation').click();
  const panel=page.getByTestId('conflict-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByRole('status')).toContainText('已阻止提交');
  const item=page.getByTestId('conflict-item');
  await expect(item).toContainText('时段重叠');
  await expect(item).toContainText('陈默');
  await expect(item).toContainText('赵安');
  await expect(item).toContainText('2026-09-01 09:00');
  // 被阻止的委托不会出现在记录里
  await expect(page.getByTestId('delegation-table')).not.toContainText('王宁');
 });

 test('禁止委托本人',async({page})=>{
  await resetDelegation(page);
  await page.goto('/delegations');
  await page.getByLabel('委托人').selectOption({label:'陆远'});
  await page.getByLabel('受托人').selectOption({label:'陆远'});
  await page.getByTestId('submit-delegation').click();
  await expect(page.getByTestId('conflict-panel')).toBeVisible();
  await expect(page.getByTestId('conflict-item')).toContainText('禁止委托本人');
 });

 test('循环委托链被阻止并列出闭环路径',async({page})=>{
  await resetDelegation(page);
  await page.goto('/delegations');
  // 生效链：陈默→赵安→陆远（财务）。新增 陆远→陈默 即闭环
  await page.getByLabel('委托人').selectOption({label:'陆远'});
  await page.getByLabel('受托人').selectOption({label:'陈默'});
  await page.getByLabel('委托业务域').selectOption({label:'财务'});
  await page.getByLabel('委托开始时间').fill('2026-09-12T09:00');
  await page.getByLabel('委托结束时间').fill('2026-09-24T18:00');
  await page.getByTestId('submit-delegation').click();
  const item=page.getByTestId('conflict-item');
  await expect(item).toContainText('循环委托链');
  await expect(page.getByTestId('cycle-path')).toContainText('陆远 → 陈默 → 赵安 → 陆远');
  // 闭环涉及的每条委托都列出
  await expect(item).toContainText('陈默');
  await expect(item).toContainText('赵安');
  await expect(item).toContainText('陆远');
 });

 test('表单预览按申请人解析实际代办人（含多级委托链）',async({page})=>{
  await resetDelegation(page);
  await page.goto('/workflows/wf-1/preview');
  // 林秋的主管是陈默，陈默→赵安→陆远（财务域生效链）
  await page.getByLabel('模拟申请人').selectOption({label:'林秋'});
  const route=page.getByTestId('approval-route');
  await expect(route).toContainText('名义审批人');
  await expect(route).toContainText('陈默');
  await expect(page.getByTestId('actual-approver')).toHaveText('陆远');
  await expect(page.getByTestId('approval-chain')).toContainText('陈默');
  await expect(page.getByTestId('approval-chain')).toContainText('赵安');
  // 无生效委托的申请人显示本人处理
  await page.getByLabel('模拟申请人').selectOption({label:'苏菲'});
  await expect(page.getByTestId('approval-route')).toContainText('方可');
  await expect(page.getByTestId('actual-approver')).toHaveText('方可');
 });

 test('撤销只影响后续流转，历史签字保留原处理人',async({page})=>{
  await resetDelegation(page);
  // 种子签字：INS-2026-0027 由林秋代王宁（dlg-3 已撤销），实例当前已在“金额判断”
  await page.goto('/monitor?instance=INS-2026-0027');
  await expect(page.getByTestId('instance-detail')).toBeVisible();
  await expect(page.getByTestId('timeline-signature')).toContainText('林秋 代 王宁');
  await expect(page.getByTestId('signature-record')).toContainText('委托已撤销，签字保留');
  // 当前为系统节点，不再产生人工审批
  await expect(page.getByTestId('assignee-card')).toContainText('系统节点');
  // 委托台撤销一条生效委托后，监控里的实际代办人同步更新
  await page.goto('/delegations');
  const row=page.getByTestId('delegation-row').filter({hasText:'陈默'}).filter({hasText:'赵安'});
  await row.getByTestId('revoke-delegation').click();
  await expect(page.getByRole('status')).toContainText('仅影响后续流转');
  await page.goto('/monitor?instance=INS-2026-0001');
  await expect(page.getByTestId('instance-detail')).toBeVisible();
  // INS-2026-0001 申请人林秋，主管陈默，撤销后由陈默本人处理
  await expect(page.getByTestId('drawer-actual-approver')).toHaveText('陈默');
  // 刷新后撤销状态与运行记录仍然一致
  await page.reload();
  await expect(page.getByTestId('drawer-actual-approver')).toHaveText('陈默');
  await page.goto('/delegations');
  await page.getByRole('button',{name:'已撤销'}).click();
  await expect(page.getByTestId('delegation-table')).toContainText('陈默');
 });

 test('异常实例可由实际代办人签字，签字进入记录',async({page})=>{
  await resetDelegation(page);
  await page.goto('/monitor?instance=INS-2026-0001');
  await expect(page.getByTestId('instance-detail')).toBeVisible();
  // 申请人林秋，主管陈默，财务域生效链 陈默→赵安→陆远，故实际代办人为陆远
  await expect(page.getByTestId('drawer-actual-approver')).toHaveText('陆远');
  await page.getByTestId('sign-approval').click();
  await expect(page.getByRole('status')).toContainText('审批签字完成');
  await expect(page.getByTestId('timeline-signature')).toContainText('陆远 代 陈默');
  // 委托台签字记录与实例一致
  await page.goto('/delegations');
  await expect(page.getByTestId('signature-table')).toContainText('INS-2026-0001');
  await expect(page.getByTestId('signature-table')).toContainText('陆远');
 });
});
