import {test,expect} from '@playwright/test';
test.describe.serial('FlowDesk 完整链路',()=>{
 test('Dashboard KPI 与最近流程进入编辑器',async({page})=>{await page.goto('/');await expect(page.getByTestId('kpi-grid')).toBeVisible();await expect(page.getByText('流程总数')).toBeVisible();await expect(page.getByText('异常实例',{exact:true}).first()).toBeVisible();await page.getByTestId('recent-workflow').first().click();await expect(page.getByTestId('flow-canvas')).toBeVisible();});
 test('审批配置、保存和双区域校验',async({page})=>{await page.goto('/workflows/wf-1');await page.getByTestId('canvas-node-approval').click();await expect(page.getByTestId('config-panel')).toContainText('审批配置');await page.getByLabel('审批人来源').selectOption({label:'固定角色'});await page.getByTestId('save-node-config').click();await page.getByRole('button',{name:'保存草稿'}).click();await page.getByTestId('validate-button').click();await expect(page.getByTestId('canvas-node-condition')).toHaveClass(/invalid/);await expect(page.getByTestId('issues-panel')).toContainText('条件分支规则未配置');const before=await page.getByTestId('error-count').textContent();expect(Number(before?.match(/\d+/)?.[0])).toBeGreaterThan(0);await page.getByTestId('canvas-node-condition').click();await page.getByLabel('条件字段').selectOption('amount');await page.getByLabel('条件比较值').fill('5000');await page.getByTestId('save-node-config').click();await page.getByTestId('validate-button').click();await expect(page.getByTestId('error-count')).toContainText('0 错误');});
 test('表单预览金额驱动条件分支',async({page})=>{await page.goto('/workflows/wf-1/preview');await expect(page.getByTestId('branch-result')).toContainText('标准分支');await page.getByLabel('申请金额').fill('12000');await expect(page.getByTestId('branch-result')).toContainText('高额分支');});
 test('发布后列表和总览同步',async({page})=>{await page.goto('/workflows/wf-2');await page.getByTestId('publish-button').click();await expect(page.getByRole('status')).toContainText('发布成功');await page.getByRole('link',{name:'流程管理'}).click();const row=page.getByTestId('workflow-row').filter({hasText:'采购合同审批'});await expect(row).toContainText('已发布');await expect(row).toContainText('v3');await page.getByRole('link',{name:'总览'}).click();await expect(page.getByTestId('kpi-grid')).toBeVisible();});
 test('异常实例详情、时间线与当前节点高亮',async({page})=>{await page.goto('/monitor');await page.getByRole('button',{name:'异常',exact:true}).click();await page.getByTestId('instance-row').first().click();await expect(page.getByTestId('instance-detail')).toBeVisible();await expect(page.getByTestId('execution-timeline')).toContainText('提交申请');await expect(page.locator('.runtime-highlight')).toHaveCount(1);});
 test('版本比较并恢复历史版本',async({page})=>{await page.goto('/workflows/wf-2/versions');await expect(page.getByTestId('version-compare')).toContainText('新增节点');await page.getByTestId('restore-version').click();await expect(page).toHaveURL(/\/workflows\/wf-2$/);await expect(page.getByRole('status')).toContainText('已恢复');await expect(page.getByTestId('flow-canvas')).toBeVisible();});
});

test.describe.serial('审批委托台',()=>{
 test('时段重叠冲突会列出委托人、受托人、时段和命中规则',async({page})=>{
  await page.goto('/delegations');
  await expect(page.getByTestId('delegation-row').filter({hasText:'陈默'}).filter({hasText:'王宁'})).toContainText('生效中');
  // 陈默在财务域已有 09-15 ~ 09-27 的生效委托，再登记一段重叠时段必须被拦截
  await page.getByLabel('委托人').selectOption('陈默');
  await page.getByLabel('受托人').selectOption('苏菲');
  await page.getByLabel('业务域',{exact:true}).selectOption('财务');
  await page.getByLabel('委托开始时间').fill('2026-09-20T09:00');
  await page.getByLabel('委托结束时间').fill('2026-09-25T18:00');
  await page.getByTestId('submit-delegation').click();
  const panel=page.getByTestId('conflict-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('时段重叠');
  await expect(panel).toContainText('陈默');
  await expect(panel).toContainText('王宁');
  await expect(panel).toContainText('2026-09-15 09:00');
  await expect(panel.getByTestId('conflict-item')).toHaveCount(1);
 });
 test('首尾相接不算重叠，登记成功并可撤销',async({page})=>{
  await page.goto('/delegations');
  await page.getByLabel('委托人').selectOption('陈默');
  await page.getByLabel('受托人').selectOption('苏菲');
  await page.getByLabel('业务域',{exact:true}).selectOption('财务');
  await page.getByLabel('委托开始时间').fill('2026-09-27T18:00');
  await page.getByLabel('委托结束时间').fill('2026-09-28T18:00');
  await page.getByTestId('submit-delegation').click();
  await expect(page.getByRole('status')).toContainText('委托已生效');
  await expect(page.getByTestId('conflict-panel')).toHaveCount(0);
  const row=page.getByTestId('delegation-row').filter({hasText:'陈默'}).filter({hasText:'苏菲'});
  await expect(row).toContainText('待生效');
  await row.getByTestId('revoke-delegation').click();
  await expect(page.getByRole('status')).toContainText('仅影响后续流转');
  await expect(row).toContainText('已撤销');
 });
 test('跨人转委托最终指回本人时命中循环委托链',async({page})=>{
  await page.goto('/delegations');
  // 种子：陈默→王宁（财务，含 09-22）、王宁→赵安（财务，含 09-22）
  // 再登记 赵安→陈默（财务，覆盖 09-22）：赵安 → 陈默 → 王宁 → 赵安 成环
  await page.getByLabel('委托人').selectOption('赵安');
  await page.getByLabel('受托人').selectOption('陈默');
  await page.getByLabel('业务域',{exact:true}).selectOption('财务');
  await page.getByLabel('委托开始时间').fill('2026-09-22T09:00');
  await page.getByLabel('委托结束时间').fill('2026-09-23T18:00');
  await page.getByTestId('submit-delegation').click();
  const panel=page.getByTestId('conflict-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('conflict-item').filter({hasText:'循环委托链'})).toBeVisible();
  await expect(panel.getByTestId('cycle-chain')).toContainText('陈默');
  await expect(panel.getByTestId('cycle-chain')).toContainText('王宁');
  await expect(panel.getByTestId('cycle-chain')).toContainText('赵安');
 });
 test('表单预览显示经委托链解析的实际代办人',async({page})=>{
  await page.goto('/workflows/wf-1/preview');
  // 林秋 的直属主管是 陈默；财务域 陈默→王宁→赵安，故实际代办人为赵安
  await page.getByLabel('预览申请人').selectOption('林秋');
  const card=page.getByTestId('approver-resolution');
  await expect(card).toContainText('陈默');
  await expect(page.getByTestId('actual-approver')).toHaveText('赵安');
  await expect(page.getByTestId('delegation-chain')).toContainText('王宁');
  // 无生效委托的申请人显示本人主管
  await page.getByLabel('预览申请人').selectOption('苏菲');
  await expect(page.getByTestId('actual-approver')).toHaveText('陆远');
 });
 test('异常实例展示实际代办人；代办签字后撤销委托，历史签字保留原处理人',async({page})=>{
  await page.goto('/monitor');
  await page.getByRole('button',{name:'异常',exact:true}).click();
  // INS-2026-0001：申请人林秋、财务域，当前停在直属主管审批
  await page.getByText('INS-2026-0001').click();
  await expect(page.getByTestId('assignment-card')).toBeVisible();
  await expect(page.getByTestId('pending-handler')).toHaveText('赵安');
  await page.getByTestId('sign-approval').click();
  await expect(page.getByRole('status')).toContainText('赵安');
  const record=page.getByTestId('signed-record');
  await expect(record).toContainText('赵安');
  await expect(record).toContainText('代 陈默');
  // 到委托台撤销 陈默→王宁 的生效委托
  await page.goto('/delegations');
  const dlg=page.getByTestId('delegation-row').filter({hasText:'陈默'}).filter({hasText:'王宁'});
  await dlg.getByTestId('revoke-delegation').click();
  await expect(page.getByRole('status')).toContainText('仅影响后续流转');
  await expect(dlg).toContainText('已撤销');
  // 刷新后委托关系与流程运行记录一致：历史签字仍是赵安
  await page.reload();
  await expect(dlg).toContainText('已撤销');
  await page.goto('/monitor');
  await page.getByText('INS-2026-0001').click();
  await expect(page.getByTestId('signed-record')).toContainText('赵安');
  await expect(page.getByTestId('signed-record')).toContainText('签字已固化');
  await expect(page.getByTestId('assignment-card')).toHaveCount(0);
 });
});

test('1440px 桌面视觉与控制台验证',async({page})=>{
 const errors:string[]=[]; page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 for(const path of ['/','/workflows/wf-1','/monitor','/delegations']){await page.goto(path);await page.waitForTimeout(250);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);expect(overflow,`${path} 不应横向溢出`).toBeFalsy()}
 await page.goto('/'); await page.screenshot({path:'test-results/dashboard-1440.png',fullPage:true});
 expect(errors,'浏览器 console 不应出现 error').toEqual([]);
});
