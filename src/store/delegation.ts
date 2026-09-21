import type {Delegation} from '../types';
/** 半开区间相交判定：[a0,a1) 与 [b0,b1) 有交集；首尾相接不算重叠 */
export const overlaps=(a0:string,a1:string,b0:string,b1:string)=>a0<b1&&b0<a1;
/** 与种子时间一致的本地“朴素”时间串（YYYY-MM-DDTHH:mm），避免时区导致的字符串比较偏差 */
export const localNow=()=>{const p=(n:number)=>String(n).padStart(2,'0'),d=new Date();return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`};
export const delegationStatus=(d:Delegation,now:string=localNow()):'active'|'scheduled'|'expired'|'revoked'=>{
 if(d.status==='revoked')return 'revoked';
 if(d.end<=now)return 'expired';
 if(d.start>now)return 'scheduled';
 return 'active';
};
/** 某业务域在 at 时点仍生效（未撤销且时段覆盖 at）的委托，按起点排序便于链路追踪 */
export const effectiveAt=(list:Delegation[],domain:string,at:string):Delegation[]=>
 list.filter(d=>d.domain===domain&&d.status!=='revoked'&&d.start<=at&&at<d.end).sort((a,b)=>a.start.localeCompare(b.start));
export interface ApproverResolution {approver:string;nominal:string;chain:Delegation[]}
/**
 * 从名义审批人出发，沿同业务域、时段生效的委托关系解析实际代办人。
 * 若出现配置导致的环状链路，终止在环节点上以避免死循环。
 */
export const resolveApprover=(list:Delegation[],nominal:string,domain:string,at:string=localNow()):ApproverResolution=>{
 const edges=effectiveAt(list,domain,at);const chain:Delegation[]=[];const seen=new Set<string>([nominal]);let current=nominal;
 for(;;){const edge=edges.find(d=>d.delegator===current);if(!edge||seen.has(edge.delegate))break;seen.add(edge.delegate);chain.push(edge);current=edge.delegate;}
 return {approver:current,nominal,chain};
};
export type ConflictRule='INVALID'|'OVERLAP'|'CYCLE';
export interface DelegationConflict {rule:Exclude<ConflictRule,'INVALID'>;delegator:string;delegate:string;start:string;end:string;message:string;existing?:Delegation;path?:Delegation[]}
export interface ConflictReport {input:{delegator:string;delegate:string;domain:string;start:string;end:string};conflicts:DelegationConflict[];errors:string[]}
/** 登记前校验：基本合法性、本人同域时段重叠、循环委托链 */
export const evaluateDelegation=(input:{delegator:string;delegate:string;domain:string;start:string;end:string;reason?:string},existing:Delegation[]):ConflictReport=>{
 const errors:string[]=[];const {delegator,delegate,domain,start,end}=input;
 if(!delegator)errors.push('请选择委托人');
 if(!delegate)errors.push('请选择受托人');
 if(!start||!end)errors.push('请填写完整的委托时段');
 else if(start>=end)errors.push('委托开始时间必须早于结束时间');
 if(delegator&&delegate&&delegator===delegate)errors.push('受托人不能与委托人为同一人');
 const conflicts:DelegationConflict[]=[];
 if(!errors.length){
  existing.filter(d=>d.status!=='revoked'&&d.delegator===delegator&&d.domain===domain&&overlaps(start,end,d.start,d.end))
   .forEach(d=>conflicts.push({rule:'OVERLAP',delegator:d.delegator,delegate:d.delegate,start:d.start,end:d.end,message:`与该委托时段重叠（${fmtRange(d.start,d.end)}）`,existing:d}));
  // 沿“受托人 → … → 委托人”方向追踪；只要在 [start,end) 内存在共同时点的闭环即判定为循环
  const inWindow=existing.filter(d=>d.status!=='revoked'&&d.domain===domain&&d.start<end&&start<d.end);
  const stack:{person:string;path:Delegation[]}[]=[{person:delegate,path:[]}];const guard=new Set<string>();
  while(stack.length){const {person,path}=stack.pop()!;const key=person+'|'+path.map(p=>p.id).join('>');if(guard.has(key))continue;guard.add(key);
   for(const edge of inWindow.filter(d=>d.delegator===person)){const next=[...path,edge];
    if(edge.delegate===delegator){conflicts.push({rule:'CYCLE',delegator:edge.delegator,delegate:edge.delegate,start:edge.start,end:edge.end,message:'委托链将回到委托人本人，形成循环委托',path:[...next,{...input,id:'__new__',status:'active',createdAt:''} as unknown as Delegation]});}
    else if(!next.slice(0,-1).some(p=>p.delegator===edge.delegate))stack.push({person:edge.delegate,path:next});}}
 }
 return {input:{delegator,delegate,domain,start,end},conflicts,errors};
};
export const fmtRange=(start:string,end:string)=>`${fmtDT(start)} ~ ${fmtDT(end)}`;
export const fmtDT=(iso:string)=>iso.replace('T',' ');
/** datetime-local 控件的默认值：现在 / 七天后（取整到分钟） */
export const defaultRange=()=>{const pad=(n:number)=>String(n).padStart(2,'0');const f=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;const a=new Date();const b=new Date(Date.now()+7*864e5);return {start:f(a),end:f(b)}};
