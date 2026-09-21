import type {ApprovalSignature,Delegation} from '../src/types';

// 演示环境的“当前时间”，所有生效判断与时间线均以此为基准，保证刷新后结论稳定
export const NOW='2026-09-21T10:00';

export const seedDelegations:Delegation[]=[
 // 生效中：陈默把财务域审批委托给赵安，赵安再委托给陆远（多级委托链）
 {id:'dlg-1',delegator:'陈默',delegatee:'赵安',domain:'财务',startAt:'2026-09-01T09:00',endAt:'2026-09-30T18:00',reason:'季度轮岗支持',status:'active',createdAt:'2026-08-30 14:20'},
 {id:'dlg-2',delegator:'赵安',delegatee:'陆远',domain:'财务',startAt:'2026-09-10T09:00',endAt:'2026-09-25T18:00',reason:'外出项目驻场',status:'active',createdAt:'2026-09-09 11:02'},
 // 已撤销：王宁把人力资源域审批委托给林秋。撤销后不再流转新任务，但已产生的签字保留
 {id:'dlg-3',delegator:'王宁',delegatee:'林秋',domain:'人力资源',startAt:'2026-08-01T09:00',endAt:'2026-08-31T18:00',reason:'休年假',status:'revoked',createdAt:'2026-07-28 10:15',revokedAt:'2026-08-12 16:40'},
 // 生效中：方可把采购域审批委托给苏菲
 {id:'dlg-4',delegator:'方可',delegatee:'苏菲',domain:'采购',startAt:'2026-09-15T09:00',endAt:'2026-10-15T18:00',reason:'供应商大会筹备',status:'active',createdAt:'2026-09-14 09:31'},
];

// 撤销前已经完成的人工审批签字（INS-2026-0027：申请人周礼，其主管王宁是名义审批人，
// 当前节点已推进到“金额判断”，审批步骤为历史完成项）
// 该签字是“实际代办人”事实快照，撤销 dlg-3 后仍保留王宁→林秋的处理记录
export const seedSignatures:ApprovalSignature[]=[
 {id:'sig-1',instanceId:'INS-2026-0027',nodeLabel:'直属主管审批',nominalApprover:'王宁',signer:'林秋',signedAt:'2026-08-10 10:24',delegationIds:['dlg-3']},
];
