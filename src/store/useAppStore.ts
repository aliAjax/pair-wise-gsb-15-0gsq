import {create} from 'zustand';
import {workflows as seed} from '../../mock-data/workflows';
import {instances as seedInstances} from '../../mock-data/instances';
import {seedDelegations} from '../../mock-data/catalog';
import type {Delegation,FlowEdge,FlowNode,Instance,TimelineEvent,ValidationIssue,Workflow} from '../types';
import {evaluateDelegation,resolveApprover,type ConflictReport} from './delegation';
const clone=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));
const validate=(w:Workflow):ValidationIssue[]=>{const issues:ValidationIssue[]=[]; if(!w.nodes.some(n=>n.type==='end')) issues.push({nodeId:w.nodes[0]?.id||'flow',level:'error',message:'流程缺少结束节点'}); const linked=new Set(w.edges.flatMap(e=>[e.source,e.target])); w.nodes.filter(n=>n.type!=='start'&&n.type!=='end'&&!linked.has(n.id)).forEach(n=>issues.push({nodeId:n.id,level:'error',message:'必经节点不能孤立'})); w.nodes.forEach(n=>{if(n.type==='condition'&&!n.data.config.ruleType)issues.push({nodeId:n.id,level:'error',message:'条件分支规则未配置'}); if(n.type==='approval'&&!n.data.config.approverSource)issues.push({nodeId:n.id,level:'error',message:'审批人不能为空'});}); return issues};
const LS_DEL='flowdesk.delegations.v1',LS_SIG='flowdesk.signatures.v1';
const load=<T,>(key:string,fallback:T):T=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback}catch{return fallback}};
const persist=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{/* 存储不可用时静默降级 */}};
const nowText=()=>{const p=(n:number)=>String(n).padStart(2,'0'),d=new Date();return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`};
interface SignInput{instanceId:string;title:string;handler:string;via?:string}
/** 把持久化的人工签字重新应用到实例时间线（撤销委托不回改这些记录） */
const withSignatures=(list:Instance[]):Instance[]=>{
 const sigs=load<Record<string,SignInput>>(LS_SIG,{});
 return list.map(i=>({...i,timeline:i.timeline.map(t=>{const s=sigs[`${i.id}|${t.title}`];return s&&t.kind==='approval'&&t.status!=='completed'?{...t,status:'completed' as const,time:'10:24',signedBy:s.handler,...(s.via&&s.via!==s.handler?{signedVia:s.via}:{})}:t})}));
};
interface State{
 workflows:Workflow[];instances:Instance[];delegations:Delegation[];
 currentId:string;selectedNodeId:string|null;issues:ValidationIssue[];toast:string;
 setCurrent:(id:string)=>void;selectNode:(id:string|null)=>void;updateNodes:(nodes:FlowNode[])=>void;updateEdges:(edges:FlowEdge[])=>void;
 updateConfig:(id:string,config:Record<string,any>)=>void;runValidation:()=>ValidationIssue[];save:()=>void;publish:()=>void;
 create:()=>string;copy:(id:string)=>void;archive:(id:string)=>void;restore:(v:number)=>void;clearToast:()=>void;
 /** 登记委托；命中冲突时返回冲突报告且不写入 */
 registerDelegation:(d:{delegator:string;delegate:string;domain:string;start:string;end:string;reason:string})=>ConflictReport|{ok:true,delegation:Delegation};
 /** 撤销委托：只影响后续流转，不动历史签字 */
 revokeDelegation:(id:string)=>void;
 /** 人工审批签字：处理人随代办关系解析，结果固化在实例时间线上 */
 signApproval:(input:SignInput)=>void;
 resetDelegationData:()=>void;
}
export const useAppStore=create<State>((set,get)=>({
 workflows:clone(seed),
 instances:withSignatures(clone(seedInstances)),
 delegations:load(LS_DEL,clone(seedDelegations)),
 currentId:'wf-1',selectedNodeId:null,issues:[],toast:'',
 setCurrent:id=>set({currentId:id,selectedNodeId:null,issues:[]}),
 selectNode:id=>set({selectedNodeId:id}),
 updateNodes:nodes=>set(s=>({workflows:s.workflows.map(w=>w.id===s.currentId?{...w,nodes}:w)})),
 updateEdges:edges=>set(s=>({workflows:s.workflows.map(w=>w.id===s.currentId?{...w,edges}:w)})),
 updateConfig:(id,config)=>set(s=>({workflows:s.workflows.map(w=>w.id===s.currentId?{...w,nodes:w.nodes.map(n=>n.id===id?{...n,data:{...n.data,config:{...n.data.config,...config},state:'configuring'}}:n)}:w)})),
 runValidation:()=>{const w=get().workflows.find(x=>x.id===get().currentId)!; const issues=validate(w); set(s=>({issues,workflows:s.workflows.map(x=>x.id===w.id?{...x,nodes:x.nodes.map(n=>({...n,data:{...n.data,state:issues.some(i=>i.nodeId===n.id)?'invalid':'valid'}}))}:x),toast:issues.length?`发现 ${issues.length} 个问题`:'校验通过'}));return issues},
 save:()=>set(s=>({workflows:s.workflows.map(w=>w.id===s.currentId?{...w,status:'draft',updatedAt:'2026-07-11 16:30'}:w),toast:'草稿已保存'})),
 publish:()=>set(s=>({workflows:s.workflows.map(w=>w.id===s.currentId?{...w,status:'published',version:w.version+1,publishedAt:'2026-07-11 16:35',updatedAt:'2026-07-11 16:35',versions:[...w.versions,{version:w.version+1,createdAt:'2026-07-11 16:35',note:'发布最新审批配置',nodes:clone(w.nodes),edges:clone(w.edges)}]}:w),toast:'流程发布成功'})),
 create:()=>{const id='wf-'+Date.now();set(s=>({workflows:[{id,name:'未命名流程',domain:'财务',status:'draft',version:0,editor:'林秋',updatedAt:'2026-07-11 16:40',abnormalCount:0,nodes:[],edges:[],versions:[]},...s.workflows],currentId:id}));return id},
 copy:id=>set(s=>{const w=s.workflows.find(x=>x.id===id)!;return{workflows:[{...clone(w),id:'wf-'+Date.now(),name:w.name+'（副本）',status:'draft'},...s.workflows]}}),
 archive:id=>set(s=>({workflows:s.workflows.map(w=>w.id===id?{...w,status:'archived'}:w)})),
 restore:v=>set(s=>({workflows:s.workflows.map(w=>{if(w.id!==s.currentId)return w;const old=w.versions.find(x=>x.version===v)!;return{...w,status:'draft',nodes:clone(old.nodes),edges:clone(old.edges)}}),toast:`已恢复 v${v} 为草稿`})),
 clearToast:()=>set({toast:''}),
 registerDelegation:d=>{
  const report=evaluateDelegation(d,get().delegations);
  if(report.errors.length||report.conflicts.length){set({toast:report.errors[0]||`登记冲突：命中 ${report.conflicts.length} 条规则`});return report}
  const delegation:Delegation={id:'dlg-'+Date.now(),...d,status:'active',createdAt:nowText()};
  set(s=>{const delegations=[delegation,...s.delegations];persist(LS_DEL,delegations);return{delegations,toast:`委托已生效：${d.delegator} → ${d.delegate}（${d.domain}）`}});
  return {ok:true,delegation};
 },
 revokeDelegation:id=>set(s=>{const target=s.delegations.find(d=>d.id===id);const delegations=s.delegations.map(d=>d.id===id?{...d,status:'revoked' as const,revokedAt:nowText()}:d);persist(LS_DEL,delegations);return{delegations,toast:target?`已撤销 ${target.delegator} → ${target.delegate} 的委托，仅影响后续流转`:'委托已撤销'}}),
 signApproval:({instanceId,title,handler,via})=>{
  // 固化签字：之后即使委托被撤销，时间线上的处理人也不变
  const stamp=(t:TimelineEvent):TimelineEvent=>t.title===title&&t.status!=='completed'?{...t,status:'completed',time:nowText().slice(11),signedBy:handler,...(via&&via!==handler?{signedVia:via}:{})}:t;
  set(s=>{
   const instances=s.instances.map(i=>i.id===instanceId?{...i,timeline:i.timeline.map(stamp)}:i);
   const sig=load<Record<string,SignInput>>(LS_SIG,{});sig[`${instanceId}|${title}`]={instanceId,title,handler,via};persist(LS_SIG,sig);
   return{instances,toast:via&&via!==handler?`已由 ${handler} 代 ${via} 完成审批签字`:`${handler} 已完成审批签字`};
  });
 },
 resetDelegationData:()=>{persist(LS_DEL,clone(seedDelegations));persist(LS_SIG,{});set({delegations:clone(seedDelegations),instances:clone(seedInstances),toast:'已恢复演示委托与实例数据'})}
}));
export {resolveApprover};
