import type {Delegation,DelegationConflict} from '../types';

export interface DelegationInput {delegator:string;delegatee:string;domain:string;startAt:string;endAt:string;reason:string}
export interface ResolvedApprover {nominal:string;actual:string;chain:Delegation[]}

/** 半开区间重叠：[start,end)，首尾相接不算重叠 */
export const windowsOverlap=(aStart:string,aEnd:string,bStart:string,bEnd:string)=>aStart<bEnd&&bStart<aEnd;

const active=(d:Delegation,at?:string)=>d.status==='active'&&(!at||(d.startAt<=at&&at<d.endAt));

/**
 * 登记校验：
 * 1) 禁止委托本人；
 * 2) 同一委托人在同一业务域内，生效时段不得与已有生效委托重叠；
 * 3) 新委托不得让生效委托形成环（A→B→…→A）。
 */
export function findConflicts(input:DelegationInput,existing:Delegation[],now=nowFallback()):DelegationConflict[]{
 const conflicts:DelegationConflict[]=[];
 if(!input.startAt||!input.endAt||input.endAt<=input.startAt){
  conflicts.push({rule:'时段重叠',message:'委托时段不合法：结束时间必须晚于开始时间'});
  return conflicts;
 }
 if(input.delegator===input.delegatee){
  conflicts.push({rule:'禁止委托本人',message:`委托人 ${input.delegator} 与受托人相同，审批任务必须交由他人处理`});
  return conflicts;
 }
 const pool=existing.filter(d=>active(d,now));
 // 规则二：本人同域时段重叠
 pool.filter(d=>d.delegator===input.delegator&&d.domain===input.domain)
  .filter(d=>windowsOverlap(d.startAt,d.endAt,input.startAt,input.endAt))
  .forEach(d=>conflicts.push({rule:'时段重叠',message:`与本人已登记的生效委托 ${d.id} 时段重叠，同一业务域不能同时委托给两人`,delegation:d}));
 if(conflicts.length)return conflicts;
 // 规则三：环检测。新边 delegator -> delegatee，从 delegatee 出发沿生效边回溯，若能回到 delegator 则成环
 const path:Delegation[]=[];
 const dfs=(person:string,windowStart:string,windowEnd:string):boolean=>{
  for(const d of pool.filter(x=>x.delegator===person&&x.domain===input.domain&&windowsOverlap(x.startAt,x.endAt,windowStart,windowEnd))){
   if(path.includes(d))continue;
   path.push(d);
   if(d.delegatee===input.delegator)return true;
   if(dfs(d.delegatee,d.startAt,d.endAt))return true;
   path.pop();
  }
  return false;
 };
 if(dfs(input.delegatee,input.startAt,input.endAt)){
  const chain=[virtualDelegation(input),...path];
  conflicts.push({rule:'循环委托链',message:`新委托会形成 ${input.delegator} → ${input.delegatee} → … → ${input.delegator} 的循环委托，审批任务将无法落到实际处理人`,chain});
 }
 return conflicts;
}

function virtualDelegation(input:DelegationInput):Delegation{
 return {id:'(待登记)',delegator:input.delegator,delegatee:input.delegatee,domain:input.domain,startAt:input.startAt,endAt:input.endAt,reason:input.reason,status:'active',createdAt:''};
}

/**
 * 解析某业务域名义审批人的实际代办人，沿生效委托链逐级展开。
 * 链上每一级都要求在 at 时刻生效；出现环时停在环前（登记校验已阻止成环，此处为防御）。
 */
export function resolveApprover(nominalApprover:string,domain:string,delegations:Delegation[],at=nowFallback()):ResolvedApprover{
 const chain:Delegation[]=[];
 const seen=new Set<string>([nominalApprover]);
 let current=nominalApprover;
 for(;;){
  const d=delegations.find(x=>x.delegator===current&&x.domain===domain&&active(x,at)&&seen.has(x.delegatee)===false&&!chain.includes(x));
  if(!d)break;
  chain.push(d);
  seen.add(d.delegatee);
  current=d.delegatee;
 }
 return {nominal:nominalApprover,actual:current,chain};
}

const nowFallback=()=>new Date().toISOString().slice(0,16);

/** 环的可读路径：陈默 → 赵安 → 陆远 → 陈默 */
export const chainPath=(chain:Delegation[])=>{
 if(!chain.length)return '';
 return chain[0].delegator+' → '+chain.map(d=>d.delegatee).join(' → ');
};
