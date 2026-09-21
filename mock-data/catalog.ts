import type {Delegation} from '../src/types';
export const users=['林秋','陈默','周礼','王宁','赵安','苏菲','陆远','方可'];
export const roles=['财务审批人','部门负责人','HRBP','法务经理','采购专员','系统管理员'];
export const domains=['财务','人力资源','采购','法务','IT服务'];
export const currentUser='林秋';
/** 直属主管关系（用于把审批人来源“直属主管”解析成具体成员） */
export const managers:Record<string,string>={
 林秋:'陈默',陈默:'赵安',周礼:'陈默',王宁:'赵安',赵安:'方可',苏菲:'陆远',陆远:'方可',方可:'方可'
};
/** 委托种子数据：覆盖生效中、待生效、已撤销、已结束 */
export const seedDelegations:Delegation[]=[
 {id:'dlg-1',delegator:'陈默',delegate:'王宁',domain:'财务',start:'2026-09-15T09:00',end:'2026-09-27T18:00',reason:'外出参加集团财务培训',status:'active',createdAt:'2026-09-10 14:22'},
 {id:'dlg-2',delegator:'王宁',delegate:'赵安',domain:'财务',start:'2026-09-19T00:00',end:'2026-09-26T09:00',reason:'年假，期间财务审批统一转给赵安',status:'active',createdAt:'2026-09-12 10:05'},
 {id:'dlg-3',delegator:'陆远',delegate:'苏菲',domain:'人力资源',start:'2026-09-23T09:00',end:'2026-09-30T18:00',reason:'跨城驻场，HR 审批请苏菲代办',status:'active',createdAt:'2026-09-15 16:40'},
 {id:'dlg-4',delegator:'周礼',delegate:'陈默',domain:'采购',start:'2026-08-01T09:00',end:'2026-08-15T18:00',reason:'暑期轮休',status:'revoked',createdAt:'2026-07-28 11:00',revokedAt:'2026-08-05 09:30'},
 {id:'dlg-5',delegator:'林秋',delegate:'周礼',domain:'法务',start:'2026-08-10T09:00',end:'2026-08-20T18:00',reason:'出差期间法务用印审批委托',status:'active',createdAt:'2026-08-08 09:12'}
];
